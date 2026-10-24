import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import type { Mock } from '@vitest/spy'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_CATEGORY_FAVORITES,
  STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_DARK,
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_GROUP_EXPANDED,
  STORAGE_KEY_GROUP_STREAMS,
  STORAGE_KEY_LANGUAGE,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
  STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
  STORAGE_KEY_SHOW_CATEGORY_FAVORITES,
  STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_SHOW_FAVORITES,
  STORAGE_KEY_SHOW_GROUPS,
  STORAGE_KEY_SHOW_NO_GROUP,
  STORAGE_KEY_SHOW_NOTIFICATIONS,
  STORAGE_KEY_STREAM_ORDER,
  STORAGE_KEY_STREAM_ORDER_SORT,
} from '@/types/syncStorageKeysTypes'
import { STORAGE_KEY_ACCOUNTS_CACHE_STREAMS } from '@/types/localStorageKeysTypes'
import { browser } from 'wxt/browser'
import type { ThemeInstance } from 'vuetify'
import type { Composer } from 'vue-i18n'
import { locale } from '@/plugins/i18n'
import { account as accountFixture, streamItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/appBusiness', () => ({
  default: {
    getSelfUser: vi.fn(),
    revoke: vi.fn(() => Promise.resolve()),
    getStreamersFollowed: vi.fn(),
    renewToken: vi.fn(),
  },
}))

const getSelfUserMock = AppBusiness.getSelfUser as Mock<typeof AppBusiness.getSelfUser>
const revokeMock = AppBusiness.revoke as Mock<typeof AppBusiness.revoke>
const renewTokenMock = AppBusiness.renewToken as Mock<typeof AppBusiness.renewToken>
const getStreamersFollowedMock = AppBusiness.getStreamersFollowed as Mock<typeof AppBusiness.getStreamersFollowed>

function themeMock() {
  return { change: vi.fn() } as unknown as ThemeInstance & { change: Mock }
}
function i18nMock() {
  return { locale: ref<string>('en') } as unknown as Composer
}
async function syncStorage(key: string) {
  // Writes are fire-and-forget, wait until the value lands
  let value: unknown
  await vi.waitFor(async () => {
    value = (await browser.storage.sync.get(key))[key]
    expect(value).not.toBeUndefined()
  })
  return value
}

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

  it('Renew the expired YouTube token with the refresh token', async () => {
    const system = useSystemStore()
    const youtube = {
      ...account,
      type: 'youtube' as const,
      expiresAt: Date.now() - 1000,
      refreshToken: 'refreshToken',
    }
    system.addAccount(youtube)
    getSelfUserMock.mockResolvedValue({ type: 'youtube', id: 'oldId', name: 'Old Name', login: 'oldlogin' })

    renewTokenMock.mockResolvedValueOnce({ token: 'renewed', expiresAt: Date.now() + 1000 })
    await system.fetchAccounts()
    expect(renewTokenMock).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: 'refreshToken' }))
    expect(system.accounts.youtube).toMatchObject({ token: 'renewed', invalid: false })

    // A network failure tries again later, a rejected refresh token logs out
    system.accounts.youtube!.expiresAt = Date.now() - 1000
    renewTokenMock.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    await system.fetchAccounts()
    expect(system.accounts.youtube!.invalid).toBe(false)

    renewTokenMock.mockRejectedValueOnce(unauthorizedError())
    await system.fetchAccounts()
    expect(system.accounts.youtube!.invalid).toBe(true)

    // Revoking the refresh token revokes the access tokens too
    system.removeAccount('youtube')
    expect(revokeMock).toHaveBeenLastCalledWith('youtube', 'refreshToken')
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

  describe('System', () => {
    it('Go to the streams view when the home screen opens', () => {
      const system = useSystemStore()
      system.setView('settings', { categoryId: '1' })
      system.setHeaderAppBarView('video')

      system.setScreen('auth')
      expect(system.view).toBe('settings')

      system.setScreen('home')
      expect(system.screen).toBe('home')
      expect(system.view).toBe('streams')
      expect(system.viewData).toBeUndefined()
      expect(system.headerAppBarView).toBeUndefined()
    })
    it('Count loadings and refreshes without going negative', () => {
      const system = useSystemStore()
      system.loading()
      system.loading()
      system.refreshing()
      expect(system.isLoading).toBe(true)
      expect(system.isRefreshing).toBe(true)

      system.loaded()
      system.loaded()
      system.loaded()
      system.refreshed()
      system.refreshed()
      expect(system.loadingCount).toBe(0)
      expect(system.refreshingCount).toBe(0)
      expect(system.isLoading).toBe(false)
      expect(system.isRefreshing).toBe(false)
    })
    it('Update the timer', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(1000)
      const system = useSystemStore()
      vi.setSystemTime(5000)

      system.updateTimer()

      expect(system.timer).toBe(5000)
      vi.useRealTimers()
    })
  })

  describe('init', () => {
    it('Use the defaults with an empty storage', async () => {
      const system = useSystemStore()
      const theme = themeMock()
      const i18n = i18nMock()

      await system.init(theme, i18n)

      expect(system.accounts).toStrictEqual({})
      expect(system.notificationType).toBe('partial')
      expect(system.dark).toBe(false)
      expect(system.language).toBe(locale)
      expect(system.streamOrder).toBe('name')
      expect(system.streamOrderSort).toBe(true)
      expect(system.groupStreams).toStrictEqual([])
      expect(system.accountsCacheStreams).toStrictEqual({})
      expect(theme.change).toHaveBeenCalledWith('light')
      expect(i18n.locale.value).toBe(locale)
      expect(document.documentElement.getAttribute('lang')).toBe(locale)
    })
    it('Load every stored value', async () => {
      const stored = {
        [STORAGE_KEY_ACCOUNTS]: { twitch: accountFixture() },
        [STORAGE_KEY_NOTIFICATIONS]: [{ type: 'twitch', id: '1' }],
        [STORAGE_KEY_NOTIFICATION_TYPE]: 'all',
        [STORAGE_KEY_FAVORITES]: [{ type: 'twitch', id: '2' }],
        [STORAGE_KEY_DARK]: true,
        [STORAGE_KEY_LANGUAGE]: 'pt',
        [STORAGE_KEY_SHOW_ALWAYS_OFFLINES]: true,
        [STORAGE_KEY_SHOW_NO_GROUP]: true,
        [STORAGE_KEY_STREAM_ORDER]: 'game',
        [STORAGE_KEY_STREAM_ORDER_SORT]: false,
        [STORAGE_KEY_SHOW_GROUPS]: true,
        [STORAGE_KEY_SHOW_FAVORITES]: true,
        [STORAGE_KEY_SHOW_CATEGORY_FAVORITES]: true,
        [STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS]: true,
        [STORAGE_KEY_SHOW_NOTIFICATIONS]: true,
        [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: [{ id: 'c', name: 'Minecraft', streams: [] }],
        [STORAGE_KEY_GROUP_STREAMS]: [{ id: 'g', name: 'Group', streams: [] }],
        [STORAGE_KEY_GROUP_EXPANDED]: ['g'],
        [STORAGE_KEY_CATEGORY_FAVORITES]: [{ type: 'twitch', id: 'game-1', name: 'Minecraft' }],
      }
      await browser.storage.sync.set(stored)
      await browser.storage.local.set({ [STORAGE_KEY_ACCOUNTS_CACHE_STREAMS]: { twitch: [streamItem()] } })
      const system = useSystemStore()
      const theme = themeMock()
      const i18n = i18nMock()
      const setSpy = vi.spyOn(browser.storage.sync, 'set')

      await system.init(theme, i18n)

      expect(system.accounts).toStrictEqual(stored.accounts)
      expect(system.notifications).toStrictEqual(stored.notifications)
      expect(system.notificationType).toBe('all')
      expect(system.favorites).toStrictEqual(stored.favorites)
      expect(system.dark).toBe(true)
      expect(system.language).toBe('pt-BR')
      expect(system.showAlwaysOfflines).toBe(true)
      expect(system.showNoGroup).toBe(true)
      expect(system.streamOrder).toBe('game')
      expect(system.streamOrderSort).toBe(false)
      expect(system.showGroupsComp).toBe(true)
      expect(system.showFavoritesComp).toBe(true)
      expect(system.showCategoryFavoritesComp).toBe(true)
      expect(system.showCategoryNotificationsComp).toBe(true)
      expect(system.showNotificationsComp).toBe(true)
      expect(system.categoryNotifications).toStrictEqual(stored.categoryNotifications)
      expect(system.groupStreams).toStrictEqual(stored.groupStreams)
      expect(system.groupExpandedComp).toStrictEqual(['g'])
      expect(system.categoryFavorites).toStrictEqual(stored.categoryFavorites)
      expect(system.accountsCacheStreams).toStrictEqual({ twitch: [streamItem()] })
      expect(theme.change).toHaveBeenCalledWith('dark')
      expect(i18n.locale.value).toBe('pt-BR')
      // Applying the stored values must not spend the sync write quota
      expect(setSpy).not.toHaveBeenCalled()
    })
  })

  describe('Accounts', () => {
    it('Create a new account and reset its streams cache', async () => {
      const system = useSystemStore()
      system.setAccountCacheStreams('twitch', [streamItem()])

      system.addAccount(account)

      expect(system.accounts.twitch).toMatchObject({ ...account, invalid: false })
      expect(system.accounts.twitch?.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(system.accountsCacheStreams.twitch).toStrictEqual([])
      expect(system.hasAccount).toBe(1)
      expect(system.mainAccount).toBe(system.accounts.twitch)
      expect(system.validAccounts).toHaveLength(1)
      expect(await syncStorage(STORAGE_KEY_ACCOUNTS)).toMatchObject({ twitch: { token: 'oldToken' } })
      await vi.waitFor(async () => {
        const local = await browser.storage.local.get(STORAGE_KEY_ACCOUNTS_CACHE_STREAMS)
        expect(local[STORAGE_KEY_ACCOUNTS_CACHE_STREAMS]).toStrictEqual({ twitch: [] })
      })
    })
    it('Compute the account validity', () => {
      const system = useSystemStore()
      expect(system.isEveryAccountInvalid).toBe(false)
      expect(system.hasInvalidAccount).toBe(false)

      system.addAccount(account)
      system.invalidAccountByToken('oldToken')

      expect(system.isEveryAccountInvalid).toBe(true)
      expect(system.hasInvalidAccount).toBe(true)
      expect(system.validAccounts).toStrictEqual([])
    })
    it('Invalidate only a known token', () => {
      const system = useSystemStore()
      system.addAccount(account)

      system.invalidAccountByToken('unknown')
      expect(system.accounts.twitch?.invalid).toBe(false)
    })
    it('Get an account by type', () => {
      const system = useSystemStore()
      expect(() => system.getAccountByType('twitch')).toThrow('Account not found')

      system.addAccount(account)
      expect(system.getAccountByType('twitch')).toBe(system.accounts.twitch)
    })
    it('Add an authenticated account and go home', async () => {
      const system = useSystemStore()
      getSelfUserMock.mockResolvedValueOnce({ type: 'twitch', id: 'id', name: 'Name', login: 'login', avatarUrl: 'a' })

      await system.addAuthenticatedAccount({
        token: 'token',
        user: { type: 'twitch', id: 'id', name: 'Name', login: 'login', avatarUrl: 'a' },
      })

      expect(system.accounts.twitch).toMatchObject({ accountId: 'id', token: 'token', avatarUrl: 'a' })
      expect(system.screen).toBe('home')
      expect(system.loadingCount).toBe(0)
    })
    it('Stop loading even when the authenticated account fails', async () => {
      const system = useSystemStore()
      const saveSpy = vi.spyOn(browser.storage.sync, 'set').mockRejectedValueOnce(new Error('quota'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getSelfUserMock.mockImplementationOnce(() => {
        throw new TypeError('sync failure')
      })

      // fetchAccounts swallows errors of a single account, so the flow still reaches home
      await system.addAuthenticatedAccount({
        token: 'token',
        user: { type: 'twitch', id: 'id', name: 'Name', login: 'login' },
      })

      expect(system.loadingCount).toBe(0)
      await vi.waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith('Failed to save "accounts" on sync storage', expect.any(Error))
      )
      saveSpy.mockRestore()
    })
    it('Remove the account, revoke its token and go to auth', async () => {
      const system = useSystemStore()
      system.addAccount(account)
      system.setScreen('home')
      revokeMock.mockClear()

      system.removeAccount('twitch')

      expect(system.accounts.twitch).toBeUndefined()
      expect(revokeMock).toHaveBeenCalledWith('twitch', 'oldToken')
      expect(system.screen).toBe('auth')
      expect(await syncStorage(STORAGE_KEY_ACCOUNTS)).toStrictEqual({})
    })
    it('Log revoke failures and handle removing a missing account', async () => {
      const system = useSystemStore()
      system.addAccount(account)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      revokeMock.mockRejectedValueOnce(new Error('offline'))

      system.removeAccount('twitch')
      await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Failed to revoke token', expect.any(Error)))

      revokeMock.mockClear()
      system.removeAccount('twitch')
      expect(revokeMock).not.toHaveBeenCalled()
    })
    it('Fetch and cache the followed streams', async () => {
      const system = useSystemStore()
      system.addAccount(account)
      getStreamersFollowedMock.mockResolvedValueOnce([streamItem()])

      expect(await system.fetchStreamersFollowed(system.accounts.twitch!)).toStrictEqual([streamItem()])
      expect(system.accountsCacheStreams.twitch).toStrictEqual([streamItem()])
    })
    it('Log local storage failures of the streams cache', async () => {
      const system = useSystemStore()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(browser.storage.local, 'set').mockRejectedValueOnce(new Error('quota'))

      system.setAccountCacheStreams('twitch', [])

      await vi.waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith('Failed to save streams cache on local storage', expect.any(Error))
      )
    })
  })

  describe('Notifications and favorites', () => {
    it('Add, ignore duplicates, remove and clean notifications', async () => {
      const system = useSystemStore()
      system.addNotification('twitch', '1')
      system.addNotification('twitch', '1')
      system.addNotification('twitch', '2')
      expect(system.notifications).toStrictEqual([
        { type: 'twitch', id: '1' },
        { type: 'twitch', id: '2' },
      ])

      system.removeNotification('twitch', '1')
      expect(system.notifications).toStrictEqual([{ type: 'twitch', id: '2' }])

      system.cleanNotification()
      expect(system.notifications).toStrictEqual([])
      await vi.waitFor(async () => expect(await syncStorage(STORAGE_KEY_NOTIFICATIONS)).toStrictEqual([]))
    })
    it('Remove and clean favorites', () => {
      const system = useSystemStore()
      system.addFavorite('twitch', '1')
      system.addFavorite('twitch', '2')

      system.removeFavorite('twitch', '1')
      expect(system.favorites).toStrictEqual([{ type: 'twitch', id: '2' }])

      system.cleanFavorite()
      expect(system.favorites).toStrictEqual([])
    })
    it('Add, ignore duplicates, remove and clean favorite categories', async () => {
      const system = useSystemStore()
      const category = { type: 'twitch' as const, id: 'game-1', name: 'Minecraft' }

      system.addFavoriteCategory(category)
      system.addFavoriteCategory(category)
      expect(system.categoryFavorites).toStrictEqual([category])

      system.removeFavoriteCategory({ ...category, id: 'other' })
      expect(system.categoryFavorites).toStrictEqual([category])
      system.removeFavoriteCategory(category)
      expect(system.categoryFavorites).toStrictEqual([])

      system.addFavoriteCategory(category)
      system.cleanCategoryFavorite()
      expect(system.categoryFavorites).toStrictEqual([])
      await vi.waitFor(async () => expect(await syncStorage(STORAGE_KEY_CATEGORY_FAVORITES)).toStrictEqual([]))
    })
    it('Manage category notifications by name', () => {
      const system = useSystemStore()

      const id = system.addCategoryNotification('Minecraft', 'image')
      expect(system.addCategoryNotification('minecraft', 'image2')).toBe(id)
      expect(system.categoryNotifications).toStrictEqual([{ id, name: 'minecraft', imageUrl: 'image2', streams: [] }])

      system.addStreamCategoryNotification(id, 'twitch', '1')
      system.addStreamCategoryNotification(id, 'twitch', '1')
      system.addStreamCategoryNotification(id, 'twitch', '2')
      system.addStreamCategoryNotification('unknown', 'twitch', '3')
      expect(system.categoryNotifications[0].streams).toStrictEqual([
        { type: 'twitch', id: '1' },
        { type: 'twitch', id: '2' },
      ])

      system.removeStreamCategoryNotification(id, 'twitch', '1')
      system.removeStreamCategoryNotification('unknown', 'twitch', '2')
      expect(system.categoryNotifications[0].streams).toStrictEqual([{ type: 'twitch', id: '2' }])

      system.cleanAllStreamsFromCategoryNotification(id)
      system.cleanAllStreamsFromCategoryNotification('unknown')
      expect(system.categoryNotifications[0].streams).toStrictEqual([])

      const otherId = system.addCategoryNotification('Zelda')
      system.removeCategoryNotification(id)
      expect(system.categoryNotifications.map((value) => value.id)).toStrictEqual([otherId])

      system.cleanCategoryNotification()
      expect(system.categoryNotifications).toStrictEqual([])
    })
    it('Set the notification type', async () => {
      const system = useSystemStore()
      system.setNotificationType('none')

      expect(system.notificationType).toBe('none')
      expect(await syncStorage(STORAGE_KEY_NOTIFICATION_TYPE)).toBe('none')
    })
  })

  describe('Groups', () => {
    it('Manage groups and their streams', async () => {
      const system = useSystemStore()
      const id = system.addGroupStream('Group')

      system.editGroupStream(id, { name: 'Renamed' })
      system.editGroupStream('unknown', { name: 'Other' })
      expect(system.groupStreams[0].name).toBe('Renamed')

      system.addStreamToGroupStream(id, 'twitch', '1')
      system.addStreamToGroupStream(id, 'twitch', '2')
      system.addStreamToGroupStream('unknown', 'twitch', '3')
      system.removeStreamFromGroupStream(id, 'twitch', '1')
      system.removeStreamFromGroupStream('unknown', 'twitch', '2')
      expect(system.groupStreams[0].streams).toStrictEqual([{ type: 'twitch', id: '2' }])

      system.removeGroupStream(id)
      expect(system.groupStreams).toStrictEqual([])
      expect(await syncStorage(STORAGE_KEY_GROUP_STREAMS)).toStrictEqual([])
    })
  })

  describe('Preferences', () => {
    it('Apply and save dark mode and language', async () => {
      const system = useSystemStore()
      const theme = themeMock()
      const i18n = i18nMock()

      system.setDark(true, theme)
      system.setLanguage('pt-BR', i18n)

      expect(theme.change).toHaveBeenCalledWith('dark')
      expect(i18n.locale.value).toBe('pt-BR')
      expect(document.documentElement.getAttribute('lang')).toBe('pt-BR')
      expect(await syncStorage(STORAGE_KEY_DARK)).toBe(true)
      expect(await syncStorage(STORAGE_KEY_LANGUAGE)).toBe('pt-BR')
    })
    it('Save every toggle', async () => {
      const system = useSystemStore()

      system.setShowAlwaysOfflines(true)
      system.setShowNoGroup(true)
      system.showGroupsComp = true
      system.showFavoritesComp = true
      system.showCategoryFavoritesComp = true
      system.showCategoryNotificationsComp = true
      system.showNotificationsComp = true
      system.groupExpandedComp = ['g']

      for (const key of [
        STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
        STORAGE_KEY_SHOW_NO_GROUP,
        STORAGE_KEY_SHOW_GROUPS,
        STORAGE_KEY_SHOW_FAVORITES,
        STORAGE_KEY_SHOW_CATEGORY_FAVORITES,
        STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS,
        STORAGE_KEY_SHOW_NOTIFICATIONS,
      ])
        expect(await syncStorage(key)).toBe(true)
      expect(await syncStorage(STORAGE_KEY_GROUP_EXPANDED)).toStrictEqual(['g'])
      expect(system.showAlwaysOfflines).toBe(true)
      expect(system.showNoGroup).toBe(true)
    })
    it('Keep the view filters in memory only', () => {
      const system = useSystemStore()
      const setSpy = vi.spyOn(browser.storage.sync, 'set')

      system.streamFilterComp = 'a'
      system.streamNameFilterComp = 'b'
      system.categoryNameFilterComp = 'c'
      system.setVideoOrder('views')
      system.setClipPeriod('30d')
      system.setLanguageCategoryStream(['pt'])

      expect(system.streamFilter).toBe('a')
      expect(system.streamNameFilter).toBe('b')
      expect(system.categoryNameFilterComp).toBe('c')
      expect(system.videoOrder).toBe('views')
      expect(system.clipPeriod).toBe('30d')
      expect(system.languageCategoryStream).toStrictEqual(['pt'])
      expect(setSpy).not.toHaveBeenCalled()
    })
    it('Invert the direction choosing the same stream order', async () => {
      const system = useSystemStore()

      system.setStreamOrder('name')
      expect([system.streamOrder, system.streamOrderSort]).toStrictEqual(['name', false])
      system.setStreamOrder('view')
      expect([system.streamOrder, system.streamOrderSort]).toStrictEqual(['view', true])
      system.setStreamOrder('game')
      expect([system.streamOrder, system.streamOrderSort]).toStrictEqual(['game', true])

      expect(await syncStorage(STORAGE_KEY_STREAM_ORDER)).toBe('game')
      expect(await syncStorage(STORAGE_KEY_STREAM_ORDER_SORT)).toBe(true)
    })
    it('Log failures saving the stream order', async () => {
      const system = useSystemStore()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(browser.storage.sync, 'set').mockRejectedValueOnce(new Error('quota'))

      system.setStreamOrder('view')

      await vi.waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith('Failed to save stream order on sync storage', expect.any(Error))
      )
    })
  })
})
