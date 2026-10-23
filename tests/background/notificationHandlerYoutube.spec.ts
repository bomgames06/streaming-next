import { describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import notificationHandler, {
  registerNotificationHandler,
  type YoutubeNotificationData,
} from '@/background/handlers/notificationHandler'
import TwitchBusiness from '@/services/business/twitchBusiness'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
} from '@/types/syncStorageKeysTypes'
import { STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED } from '@/types/sessionStorageKeysTypes'
import type { OnlineHistory } from '@/background/handlers/notificationHandler'
import type { StreamItemLiveUpcomingType } from '@/components/listStream/types/streamItemType'
import { onlineItem, streamItem } from '@tests/__utils__/fixtures'
import { youtubeAccount } from '@tests/__utils__/youtubeServer'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getUsersByIds: vi.fn() },
}))

const live = onlineItem({
  type: 'youtube',
  id: 'UCy',
  login: 'UCy',
  name: 'Yankee',
  title: 'Yankee live',
  game: undefined,
  gameId: undefined,
  videoId: 'a-b_c',
})
function upcoming(videoId: string, id = 'UCz'): StreamItemLiveUpcomingType {
  return {
    type: 'youtube',
    status: 'upcoming',
    id,
    login: id,
    name: 'Zulu',
    title: `Zulu ${videoId}`,
    scheduledAt: moment('2026-10-24T20:00:00Z'),
    verified: false,
    videoId,
  }
}
function youtube(upcomings: StreamItemLiveUpcomingType[] = []): YoutubeNotificationData {
  return {
    streams: [
      streamItem({ type: 'youtube', id: 'UCy', profileImage: 'https://yt3/UCy.jpg' }),
      streamItem({ type: 'youtube', id: 'UCz', profileImage: 'https://yt3/UCz.jpg' }),
    ],
    upcomings,
  }
}
async function setup(options: { sync?: Record<string, unknown>; history?: OnlineHistory; started?: boolean }) {
  await browser.storage.sync.set({
    [STORAGE_KEY_ACCOUNTS]: { youtube: youtubeAccount() },
    [STORAGE_KEY_NOTIFICATION_TYPE]: 'all',
    ...options.sync,
  })
  await browser.storage.session.set({
    [STORAGE_KEY_STARTED]: options.started ?? true,
    ...(options.history && { [STORAGE_KEY_ONLINE_HISTORY]: options.history }),
  })
  vi.spyOn(browser.i18n, 'getMessage').mockReturnValue('Scheduled live')
}
function notifications() {
  return fakeBrowser.notifications.getAllCreateOptions()
}
async function history(): Promise<OnlineHistory> {
  return (await browser.storage.session.get(STORAGE_KEY_ONLINE_HISTORY))[STORAGE_KEY_ONLINE_HISTORY] as OnlineHistory
}

describe('notificationHandler with YouTube', () => {
  it('Notify the YouTube lives with the channel avatar', async () => {
    await setup({ history: { youtube: [], youtubeUpcoming: [] } })

    await notificationHandler([live], youtube())

    expect(TwitchBusiness.getUsersByIds).not.toHaveBeenCalled()
    const [[id, options]] = Object.entries(notifications())
    // The video id has dashes and underscores
    expect(id).toMatch(/^[a-zA-Z0-9]{10}-N-youtube-a-b_c$/)
    expect(options).toStrictEqual({
      type: 'basic',
      iconUrl: 'https://yt3/UCy.jpg',
      title: 'Yankee',
      message: 'Yankee live',
      contextMessage: undefined,
    })
    expect((await history()).youtube).toStrictEqual([{ id: 'UCy', category: '' }])
  })
  it('Notify the new scheduled lives once', async () => {
    await setup({ history: { youtube: [], youtubeUpcoming: ['old'] } })

    await notificationHandler([], youtube([upcoming('old'), upcoming('new')]))

    expect(Object.values(notifications())).toStrictEqual([
      {
        type: 'basic',
        iconUrl: 'https://yt3/UCz.jpg',
        title: 'Zulu',
        message: 'Zulu new',
        contextMessage: `Scheduled live · ${moment('2026-10-24T20:00:00Z').toDate().toLocaleString()}`,
      },
    ])
    expect(Object.keys(notifications())[0]).toMatch(/-N-youtube-new$/)

    // Hidden while the channel is live, it does not notify again when the live ends
    fakeBrowser.notifications.resetState()
    await notificationHandler([live], youtube([]))
    fakeBrowser.notifications.resetState()
    await notificationHandler([], youtube([upcoming('new')]))
    expect(notifications()).toStrictEqual({})
    expect((await history()).youtubeUpcoming).toStrictEqual(['new', 'old'])
  })
  it('Notify only the selected channels on partial', async () => {
    await setup({
      sync: {
        [STORAGE_KEY_NOTIFICATION_TYPE]: 'partial',
        [STORAGE_KEY_NOTIFICATIONS]: [{ type: 'youtube', id: 'UCz' }],
      },
      history: { youtube: [], youtubeUpcoming: [] },
    })

    await notificationHandler([live], youtube([upcoming('z1'), upcoming('x1', 'UCx')]))

    expect(Object.values(notifications()).map((value) => value.message)).toStrictEqual(['Zulu z1'])
  })
  it('Only record the first YouTube fetch, even after the session start', async () => {
    // Started by Twitch, YouTube added later has no history yet
    await setup({ history: { twitch: [] } })

    await notificationHandler([live], youtube([upcoming('z1')]))

    expect(notifications()).toStrictEqual({})
    expect(await history()).toStrictEqual({
      twitch: [],
      youtube: [{ id: 'UCy', category: '' }],
      youtubeUpcoming: ['z1'],
    })
  })
  it('Keep the YouTube history when it was not fetched', async () => {
    await setup({
      sync: { [STORAGE_KEY_ACCOUNTS]: { youtube: youtubeAccount(), twitch: youtubeAccount({ type: 'twitch' }) } },
      history: { twitch: [], youtube: [{ id: 'UCy', category: '' }], youtubeUpcoming: ['z1'] },
    })

    await notificationHandler([])

    expect(await history()).toStrictEqual({
      twitch: [],
      youtube: [{ id: 'UCy', category: '' }],
      youtubeUpcoming: ['z1'],
    })
  })
  it('Do nothing with an invalid YouTube account', async () => {
    await setup({ sync: { [STORAGE_KEY_ACCOUNTS]: { youtube: youtubeAccount({ invalid: true }) } } })

    await notificationHandler([live], youtube([upcoming('z1')]))

    expect(notifications()).toStrictEqual({})
    expect(await history()).toBeUndefined()
  })
  it('Open the YouTube video of a clicked notification', async () => {
    registerNotificationHandler()
    const createSpy = vi.spyOn(browser.tabs, 'create')

    await fakeBrowser.notifications.onClicked.trigger('abcdefghij-N-youtube-a-b_c')

    expect(createSpy).toHaveBeenCalledWith({ url: 'https://www.youtube.com/watch?v=a-b_c' })
  })
})
