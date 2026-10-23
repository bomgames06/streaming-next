import { describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import notificationHandler, { registerNotificationHandler } from '@/background/handlers/notificationHandler'
import TwitchBusiness from '@/services/business/twitchBusiness'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
} from '@/types/syncStorageKeysTypes'
import { STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED } from '@/types/sessionStorageKeysTypes'
import { account, onlineItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getUsersByIds: vi.fn() },
}))
const getUsersByIdsMock = TwitchBusiness.getUsersByIds as Mock<typeof TwitchBusiness.getUsersByIds>

function user(id: string, avatarUrl?: string) {
  return { type: 'twitch' as const, id, name: id, login: id, avatarUrl }
}
async function setup(options: {
  sync?: Record<string, unknown>
  session?: Record<string, unknown>
  started?: boolean
}) {
  await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() }, ...options.sync })
  await browser.storage.session.set({ [STORAGE_KEY_STARTED]: options.started ?? true, ...options.session })
  getUsersByIdsMock.mockReset()
  getUsersByIdsMock.mockImplementation(async (_, ids) => ids.map((id) => user(id, id === '1' ? 'https://a/1.png' : '')))
}
function notifications() {
  return Object.values(fakeBrowser.notifications.getAllCreateOptions())
}

describe('notificationHandler', () => {
  it('Do nothing without a valid account', async () => {
    await notificationHandler([onlineItem()])
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account({ invalid: true }) } })
    await notificationHandler([onlineItem()])

    expect((await browser.storage.session.get(STORAGE_KEY_STARTED))[STORAGE_KEY_STARTED]).toBeUndefined()
  })
  it('Only record the history on the first run', async () => {
    await setup({ started: false, sync: { [STORAGE_KEY_NOTIFICATION_TYPE]: 'all' } })

    await notificationHandler([onlineItem(), onlineItem({ id: '2', game: undefined })])

    expect(notifications()).toHaveLength(0)
    expect(await browser.storage.session.get([STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED])).toStrictEqual({
      [STORAGE_KEY_ONLINE_HISTORY]: {
        twitch: [
          { id: '1', category: 'Minecraft' },
          { id: '2', category: '' },
        ],
      },
      [STORAGE_KEY_STARTED]: true,
    })
  })
  it('Notify every new stream when the type is all', async () => {
    await setup({
      sync: { [STORAGE_KEY_NOTIFICATION_TYPE]: 'all' },
      session: { [STORAGE_KEY_ONLINE_HISTORY]: { twitch: [{ id: '3', category: '' }] } },
    })

    await notificationHandler([
      onlineItem(),
      onlineItem({ id: '2', login: 'bravo', name: 'Bravo', title: undefined, game: undefined }),
      onlineItem({ id: '3' }),
    ])

    expect(getUsersByIdsMock).toHaveBeenCalledWith('token', ['1', '2'])
    expect(notifications()).toStrictEqual([
      {
        type: 'basic',
        iconUrl: 'https://a/1.png',
        title: 'Alpha',
        message: 'Alpha title',
        contextMessage: 'Minecraft',
      },
      {
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icons/128.png'),
        title: 'Bravo',
        message: '',
        contextMessage: undefined,
      },
    ])
    expect(Object.keys(fakeBrowser.notifications.getAllCreateOptions())[0]).toMatch(/^[a-zA-Z0-9]{10}-N-twitch-alpha$/)
  })
  it('Notify only selected streams on partial and nothing on none', async () => {
    await setup({ sync: { [STORAGE_KEY_NOTIFICATIONS]: [{ type: 'twitch', id: '2' }] } })

    await notificationHandler([onlineItem(), onlineItem({ id: '2', name: 'Bravo' })])
    expect(notifications().map((value) => value.title)).toStrictEqual(['Bravo'])

    await setup({
      sync: { [STORAGE_KEY_NOTIFICATION_TYPE]: 'none', [STORAGE_KEY_NOTIFICATIONS]: [{ type: 'twitch', id: '9' }] },
    })
    fakeBrowser.notifications.resetState()
    await notificationHandler([onlineItem({ id: '9' })])
    expect(notifications()).toHaveLength(0)
  })
  it('Notify streams entering a watched category once', async () => {
    await setup({
      sync: {
        [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: [
          { id: 'a', name: 'minecraft', streams: [] },
          { id: 'b', name: 'Zelda', streams: [{ type: 'twitch', id: '3' }] },
        ],
      },
      session: { [STORAGE_KEY_ONLINE_HISTORY]: { twitch: [{ id: '2', category: 'Minecraft' }] } },
    })

    await notificationHandler([
      // Every stream of the category
      onlineItem({ id: '1', name: 'Alpha' }),
      // Was already on the category
      onlineItem({ id: '2', name: 'Bravo' }),
      // Only the selected streams of the category
      onlineItem({ id: '3', name: 'Charlie', game: 'Zelda' }),
      onlineItem({ id: '4', name: 'Delta', game: 'Zelda' }),
      onlineItem({ id: '5', name: 'Echo', game: undefined }),
    ])

    expect(notifications().map((value) => value.title)).toStrictEqual(['Alpha', 'Charlie'])
  })
  it('Treat a missing session as the first run', async () => {
    await browser.storage.sync.set({
      [STORAGE_KEY_ACCOUNTS]: { twitch: account() },
      [STORAGE_KEY_NOTIFICATION_TYPE]: 'all',
    })
    getUsersByIdsMock.mockClear()

    await notificationHandler([onlineItem()])

    expect(getUsersByIdsMock).not.toHaveBeenCalled()
    expect((await browser.storage.session.get(STORAGE_KEY_STARTED))[STORAGE_KEY_STARTED]).toBe(true)
  })
  it('Do not fetch users when nobody is new', async () => {
    await setup({ session: { [STORAGE_KEY_ONLINE_HISTORY]: { twitch: [{ id: '1', category: 'Minecraft' }] } } })

    await notificationHandler([onlineItem()])

    expect(getUsersByIdsMock).not.toHaveBeenCalled()
  })
  it('Skip streams whose user was not found', async () => {
    await setup({ sync: { [STORAGE_KEY_NOTIFICATION_TYPE]: 'all' } })
    getUsersByIdsMock.mockResolvedValueOnce([])

    await notificationHandler([onlineItem()])

    expect(notifications()).toHaveLength(0)
  })
  it('Invalidate the account when the token is rejected', async () => {
    await setup({ sync: { [STORAGE_KEY_NOTIFICATION_TYPE]: 'all' } })
    const config = { headers: new AxiosHeaders() }
    getUsersByIdsMock.mockRejectedValueOnce(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: HttpStatusCode.Unauthorized,
        statusText: '',
        data: {},
        headers: {},
        config,
      })
    )
    const sendMessageSpy = vi.spyOn(browser.runtime, 'sendMessage')

    await notificationHandler([onlineItem()])

    const sync = await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS)
    expect(sync[STORAGE_KEY_ACCOUNTS]).toMatchObject({ twitch: { invalid: true } })
    expect(await browser.action.getBadgeText({})).toBe('!')
    // No popup is open, the rejected message must be ignored
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'fetchAccounts' })
    expect(notifications()).toHaveLength(0)
    // The history is not updated, so the streams notify on the next run
    expect((await browser.storage.session.get(STORAGE_KEY_ONLINE_HISTORY))[STORAGE_KEY_ONLINE_HISTORY]).toBeUndefined()
  })
  it('Ignore other errors fetching users', async () => {
    await setup({ sync: { [STORAGE_KEY_NOTIFICATION_TYPE]: 'all' } })
    getUsersByIdsMock.mockRejectedValueOnce(new Error('Network Error'))

    await notificationHandler([onlineItem()])

    const sync = await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS)
    expect(sync[STORAGE_KEY_ACCOUNTS]).toMatchObject({ twitch: { invalid: false } })
  })

  describe('registerNotificationHandler', () => {
    it('Open the stream of a clicked notification and clear it', async () => {
      registerNotificationHandler()
      const createSpy = vi.spyOn(browser.tabs, 'create')
      const clearSpy = vi.spyOn(browser.notifications, 'clear')

      await fakeBrowser.notifications.onClicked.trigger('abcdefghij-N-twitch-alpha')
      expect(createSpy).toHaveBeenCalledWith({ url: 'https://twitch.tv/alpha' })
      expect(clearSpy).toHaveBeenCalledWith('abcdefghij-N-twitch-alpha')

      await fakeBrowser.notifications.onClicked.trigger('abcdefghij-N-other-alpha')
      await fakeBrowser.notifications.onClicked.trigger('invalid')
      expect(createSpy).toHaveBeenCalledOnce()
      expect(clearSpy).toHaveBeenCalledTimes(3)
    })
  })
})
