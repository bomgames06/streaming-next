import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import type { Mock } from '@vitest/spy'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import { STORAGE_KEY_ACCOUNTS, STORAGE_KEY_FAVORITES } from '@/types/syncStorageKeysTypes'
import { browser } from 'wxt/browser'

vi.mock('@/services/business/appBusiness', () => ({
  default: {
    getSelfUser: vi.fn(),
    revoke: vi.fn(() => Promise.resolve()),
  },
}))

const getSelfUserMock = AppBusiness.getSelfUser as Mock<typeof AppBusiness.getSelfUser>

function unauthorizedError() {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: HttpStatusCode.Unauthorized,
    statusText: 'Unauthorized',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

const account = {
  type: 'twitch' as const,
  accountId: 'oldId',
  name: 'Old Name',
  login: 'oldlogin',
  token: 'oldToken',
}

describe('useSystemStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getSelfUserMock.mockReset()
  })

  it('Update every account field when the account is replaced', () => {
    const system = useSystemStore()
    system.addAccount(account)
    system.addAccount({ ...account, accountId: 'newId', name: 'New Name', login: 'newlogin', token: 'newToken' })

    expect(system.accounts.twitch).toMatchObject({
      accountId: 'newId',
      name: 'New Name',
      login: 'newlogin',
      token: 'newToken',
      invalid: false,
    })
  })

  it('Invalidate the account only when the token is rejected', async () => {
    const system = useSystemStore()
    system.addAccount(account)

    getSelfUserMock.mockRejectedValueOnce(new Error('Network Error'))
    await system.fetchAccounts()
    expect(system.accounts.twitch?.invalid).toBe(false)

    getSelfUserMock.mockRejectedValueOnce(unauthorizedError())
    await system.fetchAccounts()
    expect(system.accounts.twitch?.invalid).toBe(true)
  })

  it('Refresh login from the API', async () => {
    const system = useSystemStore()
    system.addAccount(account)

    getSelfUserMock.mockResolvedValueOnce({ type: 'twitch', id: 'oldId', name: 'Renamed', login: 'renamed' })
    await system.fetchAccounts()

    expect(system.accounts.twitch).toMatchObject({ name: 'Renamed', login: 'renamed' })
    const syncStorage = await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS)
    expect(syncStorage[STORAGE_KEY_ACCOUNTS]).toMatchObject({ twitch: { login: 'renamed' } })
  })

  it('Do not duplicate favorites', async () => {
    const system = useSystemStore()
    system.addFavorite('twitch', '1')
    system.addFavorite('twitch', '1')

    expect(system.favorites).toStrictEqual([{ type: 'twitch', id: '1' }])
    await vi.waitFor(async () => {
      const syncStorage = await browser.storage.sync.get(STORAGE_KEY_FAVORITES)
      expect(syncStorage[STORAGE_KEY_FAVORITES]).toStrictEqual([{ type: 'twitch', id: '1' }])
    })
  })

  it('Do not duplicate streams in a group', () => {
    const system = useSystemStore()
    const id = system.addGroupStream('Group')
    system.addStreamToGroupStream(id, 'twitch', '1')
    system.addStreamToGroupStream(id, 'twitch', '1')

    expect(system.groupStreams[0].streams).toStrictEqual([{ type: 'twitch', id: '1' }])
  })

  it('Ignore blank group names on edit', () => {
    const system = useSystemStore()
    const id = system.addGroupStream('Group')
    system.editGroupStream(id, { name: '   ' })

    expect(system.groupStreams[0].name).toBe('Group')
  })
})
