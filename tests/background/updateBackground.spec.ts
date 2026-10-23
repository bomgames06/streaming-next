import { describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import registerUpdateBackground from '@/background/updateBackground'
import TwitchBusiness from '@/services/business/twitchBusiness'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getSelfUser: vi.fn() },
}))
const getSelfUserMock = TwitchBusiness.getSelfUser as Mock<typeof TwitchBusiness.getSelfUser>

const OLD_SAVE = {
  accessToken: 'old-token',
  expiredToken: false,
  filterOrderList: 'view',
  filterOrderAsc: false,
  notification: 'all',
  notificationIds: ['1', '2'],
}

async function update(previousVersion?: string, reason = 'update') {
  registerUpdateBackground()
  await fakeBrowser.runtime.onInstalled.trigger({ reason, previousVersion } as Browser.runtime.InstalledDetails)
  // The migration runs detached from the listener
  await new Promise((resolve) => setTimeout(resolve, 10))
  return browser.storage.sync.get(null)
}

describe('updateBackground', () => {
  it('Migrate the old save and the favorites from very old versions', async () => {
    await browser.storage.sync.set(OLD_SAVE)
    getSelfUserMock.mockResolvedValueOnce({ type: 'twitch', id: 'id', name: 'Name', login: 'login', avatarUrl: 'a' })

    const sync = await update('1.2.5')

    expect(getSelfUserMock).toHaveBeenCalledWith('old-token')
    expect(sync).toStrictEqual({
      accounts: {
        twitch: {
          type: 'twitch',
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          token: 'old-token',
          invalid: false,
          accountId: 'id',
          name: 'Name',
          login: 'login',
          avatarUrl: 'a',
        },
      },
      streamOrder: 'view',
      streamOrderSort: false,
      notificationType: 'all',
      notifications: [
        { id: '1', type: 'twitch' },
        { id: '2', type: 'twitch' },
      ],
      favorites: [
        { id: '1', type: 'twitch' },
        { id: '2', type: 'twitch' },
      ],
    })
  })
  it('Migrate without account when the old token is invalid or missing', async () => {
    await browser.storage.sync.set(OLD_SAVE)
    getSelfUserMock.mockRejectedValueOnce(new Error('invalid'))
    expect((await update('1.0')).accounts).toStrictEqual({})

    fakeBrowser.reset()
    getSelfUserMock.mockClear()
    const sync = await update('1.2.0')
    expect(getSelfUserMock).not.toHaveBeenCalled()
    expect(sync.accounts).toStrictEqual({})
    expect(sync.notifications).toStrictEqual([])
  })
  it('Only copy notifications to favorites from 1.3.1 or lower', async () => {
    await browser.storage.sync.set({ notifications: [{ id: '1', type: 'twitch' }] })

    const sync = await update('1.3.1')

    expect(sync.favorites).toStrictEqual([{ id: '1', type: 'twitch' }])
    expect(getSelfUserMock).not.toHaveBeenCalled()
  })
  it('Keep newer saves untouched', async () => {
    await browser.storage.sync.set({ notifications: [] })

    expect(await update('1.3.2')).toStrictEqual({ notifications: [] })
    expect(await update('1.10.0')).toStrictEqual({ notifications: [] })
    expect(await update('2')).toStrictEqual({ notifications: [] })
  })
  it('Compare versions with a different amount of parts', async () => {
    await browser.storage.sync.set({ notifications: [{ id: '1', type: 'twitch' }] })

    // 1.3 is lower than 1.3.1
    expect((await update('1.3')).favorites).toStrictEqual([{ id: '1', type: 'twitch' }])
  })
  it('Ignore installs and updates without a previous version', async () => {
    await browser.storage.sync.set(OLD_SAVE)

    expect(await update('1.0', 'install')).toStrictEqual(OLD_SAVE)
    expect(await update(undefined)).toStrictEqual(OLD_SAVE)
  })
})
