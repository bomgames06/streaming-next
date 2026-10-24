import { describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { browser } from 'wxt/browser'
import YoutubeBusiness from '@/services/business/youtubeBusiness'
import {
  STORAGE_KEY_YOUTUBE_LIVES_CACHE,
  STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE,
  type YoutubeLivesCacheStore,
} from '@/types/localStorageKeysTypes'
import {
  apiYoutubeChannel,
  apiYoutubeSubscription,
  apiYoutubeVideo,
  youtubeServer,
  type YoutubeServerData,
} from '@tests/__utils__/youtubeServer'

const hoursAgo = (hours: number) => moment().subtract(hours, 'hours').toISOString()
const hoursFromNow = (hours: number) => moment().add(hours, 'hours').toISOString()

function allowFeeds(allowed = true) {
  return vi.spyOn(browser.permissions, 'contains').mockResolvedValue(allowed as never)
}
async function livesCache(): Promise<YoutubeLivesCacheStore | undefined> {
  const storage = await browser.storage.local.get(STORAGE_KEY_YOUTUBE_LIVES_CACHE)
  return storage[STORAGE_KEY_YOUTUBE_LIVES_CACHE] as YoutubeLivesCacheStore | undefined
}

/**
 * - A: live a1 and a normal video a2, plus a3 published before the feed window
 * - B: two upcoming lives, only the next one is listed
 * - C: two lives at the same time (the one with more viewers is listed) and an upcoming one hidden by the live
 * - D: deleted channel, its feed fails
 * - E: upcoming live way behind schedule and a private video missing from the API
 */
const livesData: YoutubeServerData = {
  feeds: {
    A: [
      { videoId: 'a1', published: hoursAgo(1) },
      { videoId: 'a2', published: hoursAgo(5) },
      { videoId: 'a3', published: hoursAgo(10 * 24) },
    ],
    B: [
      { videoId: 'b1', published: hoursAgo(48) },
      { videoId: 'b2', published: hoursAgo(2) },
    ],
    C: [
      { videoId: 'c1', published: hoursAgo(3) },
      { videoId: 'c2', published: hoursAgo(2) },
      { videoId: 'c3', published: hoursAgo(1) },
    ],
    E: [
      { videoId: 'e1', published: hoursAgo(72) },
      { videoId: 'e2', published: hoursAgo(1) },
    ],
  },
  videos: [
    apiYoutubeVideo('a1', 'A', {
      liveBroadcastContent: 'live',
      channelTitle: 'Alpha',
      title: 'Alpha live',
      liveStreamingDetails: { actualStartTime: '2026-10-23T10:00:00Z', concurrentViewers: '1234' },
    }),
    apiYoutubeVideo('a2', 'A'),
    apiYoutubeVideo('a3', 'A', { liveBroadcastContent: 'live' }),
    apiYoutubeVideo('b1', 'B', {
      liveBroadcastContent: 'upcoming',
      channelTitle: 'Bravo',
      liveStreamingDetails: { scheduledStartTime: hoursFromNow(30) },
    }),
    apiYoutubeVideo('b2', 'B', {
      liveBroadcastContent: 'upcoming',
      channelTitle: 'Bravo',
      title: 'Bravo next',
      liveStreamingDetails: { scheduledStartTime: hoursFromNow(2) },
    }),
    apiYoutubeVideo('c1', 'C', { liveBroadcastContent: 'live', liveStreamingDetails: { concurrentViewers: '5' } }),
    apiYoutubeVideo('c2', 'C', { liveBroadcastContent: 'live', liveStreamingDetails: { concurrentViewers: '50' } }),
    apiYoutubeVideo('c3', 'C', {
      liveBroadcastContent: 'upcoming',
      liveStreamingDetails: { scheduledStartTime: hoursFromNow(1) },
    }),
    apiYoutubeVideo('e1', 'E', {
      liveBroadcastContent: 'upcoming',
      liveStreamingDetails: { scheduledStartTime: hoursAgo(48) },
    }),
  ],
}
const channels = ['A', 'B', 'C', 'D', 'E']

describe('YoutubeBusiness', () => {
  it('Ask the feed permission and authenticate through the background', async () => {
    youtubeServer()
    const requestSpy = vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never)
    const sendMessageSpy = vi
      .spyOn(browser.runtime, 'sendMessage')
      .mockResolvedValue({ token: 'access-token', expiresAt: 123, refreshToken: 'refresh-token' } as never)

    const result = await YoutubeBusiness.auth()

    expect(requestSpy).toHaveBeenCalledWith({ origins: ['https://www.youtube.com/*'] })
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'auth', authType: 'youtube' })
    expect(result).toStrictEqual({
      token: 'access-token',
      expiresAt: 123,
      refreshToken: 'refresh-token',
      user: {
        type: 'youtube',
        id: 'UCme',
        name: 'My channel',
        login: '@me',
        avatarUrl: 'https://yt3/me-240.jpg',
      },
    })
  })
  it('Exchange the code on streaming-next-back', async () => {
    const { http } = youtubeServer()

    const before = Date.now()
    const result = await YoutubeBusiness.exchangeCode('code', 'verifier', 'https://ext.chromiumapp.org/')

    expect(http.requests.at(-1)!.body).toStrictEqual({
      code: 'code',
      codeVerifier: 'verifier',
      redirectUri: 'https://ext.chromiumapp.org/',
    })
    expect(result.token).toBe('access-token')
    expect(result.refreshToken).toBe('refresh-token')
    // Renewed 5 minutes before the token expires
    expect(result.expiresAt - before).toBeGreaterThanOrEqual(3599 * 1000 - 5 * 60 * 1000)
    expect(result.expiresAt - Date.now()).toBeLessThanOrEqual(3599 * 1000 - 5 * 60 * 1000)
  })
  it('Reject a login without the refresh token', async () => {
    const { http } = youtubeServer()
    http.on('post', `${import.meta.env.VITE_APP_API_BACK_URL}/youtube/token`, {
      data: { accessToken: 'access-token', expiresIn: 3599 },
    })

    await expect(YoutubeBusiness.exchangeCode('code', 'verifier', 'https://ext/')).rejects.toThrow(
      'Refresh token not found'
    )
  })
  it('Renew the token with the refresh token', async () => {
    const { data, refreshRequests } = youtubeServer()

    const result = await YoutubeBusiness.renewToken('refresh-token')
    expect(result.token).toBe('renewed-token')
    expect(result.expiresAt).toBeGreaterThan(Date.now() + 50 * 60 * 1000)
    expect(refreshRequests()[0].body).toStrictEqual({ refreshToken: 'refresh-token' })

    data.refreshRejected = true
    await expect(YoutubeBusiness.renewToken('refresh-token')).rejects.toMatchObject({ response: { status: 401 } })
  })
  it('Use a fallback user for Google accounts without channel', async () => {
    youtubeServer({ me: undefined })
    expect(await YoutubeBusiness.getSelfUser('token')).toStrictEqual({
      type: 'youtube',
      id: '',
      name: 'YouTube',
      login: '',
      avatarUrl: undefined,
    })

    youtubeServer({ me: apiYoutubeChannel({ snippet: { title: 'No handle', thumbnails: {} } }) })
    expect(await YoutubeBusiness.getSelfUser('token')).toMatchObject({ id: 'UCme', login: 'UCme' })
  })
  it('Revoke through the background and drop the caches', async () => {
    const sendMessageSpy = vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(true as never)
    await browser.storage.local.set({
      [STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE]: { accountId: 'UCme', fetchedAt: 1, items: [] },
      [STORAGE_KEY_YOUTUBE_LIVES_CACHE]: { accountId: 'UCme', videos: [], finished: {} },
      other: true,
    })

    await YoutubeBusiness.revoke('token')

    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'revoke', authType: 'youtube', token: 'token' })
    expect(await browser.storage.local.get(null)).toStrictEqual({ other: true })
  })
  it('Map every page of the subscriptions and reuse them for a while', async () => {
    const { subscriptionRequests, data } = youtubeServer({
      subscriptions: [apiYoutubeSubscription('A', 'Alpha'), apiYoutubeSubscription('B', 'Bravo')],
      subscriptionsPageSize: 1,
    })

    const items = await YoutubeBusiness.getStreamersFollowed('token', 'UCme')
    expect(items).toStrictEqual([
      {
        type: 'youtube',
        status: 'stream',
        id: 'A',
        login: 'A',
        name: 'Alpha',
        profileImage: 'https://yt3/A.jpg',
        verified: false,
      },
      expect.objectContaining({ id: 'B', name: 'Bravo' }),
    ])
    expect(subscriptionRequests().map((request) => request.query.get('pageToken'))).toStrictEqual([null, '1'])
    expect(subscriptionRequests()[0].headers.Authorization).toBe('Bearer token')

    // Cached
    data.subscriptions = []
    expect(await YoutubeBusiness.getStreamersFollowed('token', 'UCme')).toHaveLength(2)
    expect(subscriptionRequests()).toHaveLength(2)

    // Forced or of another account
    expect(await YoutubeBusiness.getStreamersFollowed('token', 'UCme', true)).toStrictEqual([])
    data.subscriptions = [apiYoutubeSubscription('C', 'Charlie')]
    expect((await YoutubeBusiness.getStreamersFollowed('token', 'UCother')).map((item) => item.id)).toStrictEqual(['C'])
    expect(subscriptionRequests()).toHaveLength(4)
  })
  it('Find nothing without the feed permission', async () => {
    const { http } = youtubeServer(livesData)
    allowFeeds(false)

    expect(await YoutubeBusiness.getLivesFollowed('token', 'UCme', channels)).toStrictEqual({
      onlines: [],
      upcomings: [],
      missingPermission: true,
    })
    expect(http.requests).toHaveLength(0)
  })
  it('Classify the recent videos of the feeds, one item for each channel', async () => {
    const { videoRequests, feedRequests } = youtubeServer(livesData)
    allowFeeds()

    const result = await YoutubeBusiness.getLivesFollowed('token', 'UCme', channels)

    expect(result.missingPermission).toBe(false)
    expect(result.onlines.map((item) => [item.id, item.videoId])).toStrictEqual([
      ['A', 'a1'],
      ['C', 'c2'],
    ])
    expect(result.onlines[0]).toMatchObject({
      type: 'youtube',
      status: 'online',
      login: 'A',
      name: 'Alpha',
      title: 'Alpha live',
      viewerCount: 1234,
      verified: false,
    })
    expect(result.onlines[0].startedAt.toISOString()).toBe('2026-10-23T10:00:00.000Z')
    const previewImage = result.onlines[0].previewImage as (width: number, height: number, dump?: string) => string
    expect(previewImage(290, 163)).toBe('https://i.ytimg.com/vi/a1/mqdefault.jpg')
    expect(previewImage(290, 163, '9')).toBe('https://i.ytimg.com/vi/a1/mqdefault.jpg?dump=9')

    // The next upcoming of B, C is live and E is too late
    expect(result.upcomings).toHaveLength(1)
    expect(result.upcomings[0]).toMatchObject({
      type: 'youtube',
      status: 'upcoming',
      id: 'B',
      name: 'Bravo',
      title: 'Bravo next',
      videoId: 'b2',
      previewImage: 'https://i.ytimg.com/vi/b2/mqdefault.jpg',
    })
    expect(result.upcomings[0].scheduledAt.toISOString()).toBe(
      livesData.videos![4].liveStreamingDetails!.scheduledStartTime
    )

    // Every channel feed is read, only the recent videos are checked in a single request
    expect(feedRequests().map((request) => request.query.get('channel_id'))).toStrictEqual(channels)
    expect(videoRequests()).toHaveLength(1)
    expect(videoRequests()[0].query.get('id')!.split(',').sort()).toStrictEqual(
      ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'c3', 'e1', 'e2'].sort()
    )
    expect(videoRequests()[0].query.get('part')).toBe('snippet,liveStreamingDetails')
    expect(videoRequests()[0].headers.Authorization).toBe('Bearer token')

    // Normal and missing videos are finished, the lives are kept for the cache
    const cache = await livesCache()
    expect(Object.keys(cache!.finished).sort()).toStrictEqual(['a2', 'e2'])
    expect(cache!.videos.map((video) => video.id).sort()).toStrictEqual(['a1', 'b1', 'b2', 'c1', 'c2', 'c3', 'e1'])
  })
  it('Reuse the lives for a while and never check finished videos again', async () => {
    const { videoRequests, feedRequests, data } = youtubeServer(livesData)
    allowFeeds()

    const first = await YoutubeBusiness.getLivesFollowed('token', 'UCme', channels)

    // Within the cache time nothing is requested
    data.videos = []
    const cached = await YoutubeBusiness.getLivesFollowed('token', 'UCme', channels)
    expect(cached.onlines.map((item) => item.videoId)).toStrictEqual(first.onlines.map((item) => item.videoId))
    expect(cached.upcomings.map((item) => item.videoId)).toStrictEqual(['b2'])
    expect(feedRequests()).toHaveLength(channels.length)
    expect(videoRequests()).toHaveLength(1)

    // Forced, the lives ended (missing from the API) and the finished videos are not checked
    const forced = await YoutubeBusiness.getLivesFollowed('token', 'UCme', channels, true)
    expect(forced).toStrictEqual({ onlines: [], upcomings: [], missingPermission: false })
    expect(videoRequests()).toHaveLength(2)
    expect(videoRequests()[1].query.get('id')!.split(',').sort()).toStrictEqual(
      ['a1', 'b1', 'b2', 'c1', 'c2', 'c3', 'e1'].sort()
    )

    // Everything is finished now, no video request at all
    await YoutubeBusiness.getLivesFollowed('token', 'UCme', channels, true)
    expect(videoRequests()).toHaveLength(2)
  })
  it('Expire old finished videos and discard the cache of another account', async () => {
    const { videoRequests } = youtubeServer({
      feeds: { A: [{ videoId: 'a1', published: hoursAgo(1) }] },
      videos: [apiYoutubeVideo('a1', 'A')],
    })
    allowFeeds()
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000
    await browser.storage.local.set({
      [STORAGE_KEY_YOUTUBE_LIVES_CACHE]: {
        accountId: 'UCother',
        fetchedAt: Date.now(),
        videos: [apiYoutubeVideo('x1', 'X', { liveBroadcastContent: 'live' })],
        finished: { a1: Date.now() },
      },
    })

    // The cache of the other account is not used, even fresh
    const result = await YoutubeBusiness.getLivesFollowed('token', 'UCme', ['A'])
    expect(result.onlines).toStrictEqual([])
    expect(videoRequests()[0].query.get('id')).toBe('a1')

    const cache = await livesCache()
    await browser.storage.local.set({
      [STORAGE_KEY_YOUTUBE_LIVES_CACHE]: { ...cache, finished: { ...cache!.finished, gone: old } },
    })
    await YoutubeBusiness.getLivesFollowed('token', 'UCme', ['A'], true)
    expect(Object.keys((await livesCache())!.finished)).toStrictEqual(['a1'])
  })
  it('Check the videos in requests of 50 ids', async () => {
    const entries = Array.from({ length: 15 }, (_, index) => ({ videoId: `v${index}`, published: hoursAgo(1) }))
    const feeds = Object.fromEntries(
      ['A', 'B', 'C', 'D'].map((channelId) => [
        channelId,
        entries.map((entry) => ({ ...entry, videoId: `${channelId}-${entry.videoId}` })),
      ])
    )
    const { videoRequests, feedRequests } = youtubeServer({ feeds, videos: [] })
    allowFeeds()

    await YoutubeBusiness.getLivesFollowed('token', 'UCme', Object.keys(feeds))

    expect(feedRequests()).toHaveLength(4)
    expect(videoRequests().map((request) => request.query.get('id')!.split(',').length)).toStrictEqual([50, 10])
  })
})
