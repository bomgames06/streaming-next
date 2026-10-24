import { describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import registerFetchStreamBackground from '@/background/fetchStreamBackground'
import TwitchBusiness from '@/services/business/twitchBusiness'
import YoutubeBusiness from '@/services/business/youtubeBusiness'
import AppBusiness from '@/services/business/appBusiness'
import countHandler from '@/background/handlers/countHandler'
import notificationHandler from '@/background/handlers/notificationHandler'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import type { AccountDataStore, AccountStore } from '@/store/system/types/systemStoreType'
import type { StreamItemLiveUpcomingType } from '@/components/listStream/types/streamItemType'
import { account, onlineItem, streamItem } from '@tests/__utils__/fixtures'
import { youtubeAccount } from '@tests/__utils__/youtubeServer'
import moment from 'moment'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getStreamersOnlineFollowed: vi.fn(), validateToken: vi.fn(async () => true) },
}))
vi.mock('@/services/business/appBusiness', () => ({ default: { renewToken: vi.fn() } }))
vi.mock('@/services/business/youtubeBusiness', () => ({
  default: { getStreamersFollowed: vi.fn(), getLivesFollowed: vi.fn() },
}))
vi.mock('@/background/handlers/countHandler', () => ({
  default: vi.fn(),
  registerCountHandler: vi.fn(),
}))
vi.mock('@/background/handlers/notificationHandler', () => ({
  default: vi.fn(),
  registerNotificationHandler: vi.fn(),
}))

const twitchOnlinesMock = TwitchBusiness.getStreamersOnlineFollowed as Mock<
  typeof TwitchBusiness.getStreamersOnlineFollowed
>
const subscriptionsMock = YoutubeBusiness.getStreamersFollowed as Mock<typeof YoutubeBusiness.getStreamersFollowed>
const livesMock = YoutubeBusiness.getLivesFollowed as Mock<typeof YoutubeBusiness.getLivesFollowed>
const renewMock = AppBusiness.renewToken as Mock<typeof AppBusiness.renewToken>
const countHandlerMock = countHandler as Mock<typeof countHandler>
const notificationHandlerMock = notificationHandler as Mock<typeof notificationHandler>

const twitchOnline = onlineItem()
const youtubeOnline = onlineItem({ type: 'youtube', id: 'UCy', videoId: 'y1' })
const youtubeStreams = [streamItem({ type: 'youtube', id: 'UCy' }), streamItem({ type: 'youtube', id: 'UCz' })]
const youtubeUpcoming: StreamItemLiveUpcomingType = {
  type: 'youtube',
  status: 'upcoming',
  id: 'UCz',
  login: 'UCz',
  name: 'Zulu',
  scheduledAt: moment(),
  verified: false,
  videoId: 'z1',
}

function unauthorized() {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    status: HttpStatusCode.Unauthorized,
    statusText: '',
    data: {},
    headers: {},
    config,
  })
}
async function fetchWith(accounts: AccountDataStore) {
  await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
  for (const mock of [countHandlerMock, notificationHandlerMock, renewMock]) mock.mockReset()
  twitchOnlinesMock.mockReset().mockResolvedValue([twitchOnline])
  subscriptionsMock.mockReset().mockResolvedValue(youtubeStreams)
  livesMock
    .mockReset()
    .mockResolvedValue({ onlines: [youtubeOnline], upcomings: [youtubeUpcoming], missingPermission: false })
}
async function run() {
  registerFetchStreamBackground()
  await fakeBrowser.alarms.onAlarm.trigger({ name: 'fetchStream', scheduledTime: Date.now() } as Browser.alarms.Alarm)
  await vi.waitFor(() => expect(countHandlerMock).toHaveBeenCalled())
}
async function storedAccounts(): Promise<AccountDataStore> {
  return (await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS))[STORAGE_KEY_ACCOUNTS] as AccountDataStore
}

describe('fetchStreamBackground with YouTube', () => {
  it('Count and notify the lives of every account', async () => {
    await fetchWith({ twitch: account(), youtube: youtubeAccount() })
    await run()

    expect(subscriptionsMock).toHaveBeenCalledWith('yt-token', 'UCme')
    // Not forced, the cache keeps the quota low
    expect(livesMock).toHaveBeenCalledWith('yt-token', 'UCme', ['UCy', 'UCz'])
    expect(countHandlerMock).toHaveBeenLastCalledWith(expect.anything(), 2)
    // The scheduled lives don't notify, only when they start
    expect(notificationHandlerMock).toHaveBeenLastCalledWith([twitchOnline, youtubeOnline], { streams: youtubeStreams })
    expect(renewMock).not.toHaveBeenCalled()
  })
  it('Renew the expired token with the refresh token before fetching', async () => {
    await fetchWith({ youtube: youtubeAccount({ expiresAt: Date.now() - 1000, refreshToken: 'refresh-token' }) })
    const expiresAt = Date.now() + 55 * 60 * 1000
    renewMock.mockResolvedValue({ token: 'renewed', expiresAt })
    await run()

    expect(renewMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'youtube', refreshToken: 'refresh-token' }))
    expect(livesMock).toHaveBeenCalledWith('renewed', 'UCme', ['UCy', 'UCz'])
    const stored = (await storedAccounts()).youtube as AccountStore
    expect(stored.token).toBe('renewed')
    expect(stored.expiresAt).toBe(expiresAt)
    expect(stored.refreshToken).toBe('refresh-token')
  })
  it('Invalidate YouTube when the refresh token or the token is rejected', async () => {
    await fetchWith({
      twitch: account(),
      youtube: youtubeAccount({ expiresAt: Date.now() - 1000, refreshToken: 'refresh-token' }),
    })
    renewMock.mockRejectedValue(unauthorized())
    await run()

    expect(livesMock).not.toHaveBeenCalled()
    expect((await storedAccounts()).youtube!.invalid).toBe(true)
    // Twitch still works, without YouTube data its history is kept
    expect(notificationHandlerMock).toHaveBeenLastCalledWith([twitchOnline])

    await fetchWith({ youtube: youtubeAccount() })
    livesMock.mockRejectedValue(unauthorized())
    await run()
    expect((await storedAccounts()).youtube!.invalid).toBe(true)
  })
  it('Invalidate the expired accounts logged before the refresh token', async () => {
    await fetchWith({ youtube: youtubeAccount({ expiresAt: Date.now() - 1000 }) })
    await run()

    expect(renewMock).not.toHaveBeenCalled()
    expect((await storedAccounts()).youtube!.invalid).toBe(true)
  })
  it('Keep the account when the renew fails for other reasons', async () => {
    await fetchWith({
      twitch: account(),
      youtube: youtubeAccount({ expiresAt: Date.now() - 1000, refreshToken: 'refresh-token' }),
    })
    renewMock.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await run()

    expect((await storedAccounts()).youtube!.invalid).toBe(false)
    expect(notificationHandlerMock).toHaveBeenLastCalledWith([twitchOnline])
  })
  it('Skip YouTube on other errors or without the feed permission', async () => {
    await fetchWith({ twitch: account(), youtube: youtubeAccount() })
    livesMock.mockRejectedValue(new AxiosError('Quota exceeded', 'ERR_BAD_REQUEST'))
    await run()

    expect(countHandlerMock).toHaveBeenLastCalledWith(expect.anything(), 1)
    expect(notificationHandlerMock).toHaveBeenLastCalledWith([twitchOnline])
    expect((await storedAccounts()).youtube).toStrictEqual(youtubeAccount({ expiresAt: expect.any(Number) }))

    await fetchWith({ twitch: account(), youtube: youtubeAccount() })
    livesMock.mockResolvedValue({ onlines: [], upcomings: [], missingPermission: true })
    await run()
    expect(notificationHandlerMock).toHaveBeenLastCalledWith([twitchOnline])
  })
})
