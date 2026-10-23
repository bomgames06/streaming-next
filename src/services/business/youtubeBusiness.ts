import YoutubeApi from '@/services/api/youtube/youtubeApi'
import type { User } from '@/types/userType'
import type { AuthBackgroundMessageType, RevokeBackgroundMessageType } from '@/background/types/backgroundMessageType'
import { browser } from 'wxt/browser'
import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemLiveUpcomingType,
} from '@/components/listStream/types/streamItemType'
import moment from 'moment'
import { orderBy, pickBy, uniq, uniqBy } from 'lodash'
import { mapConcurrent } from '@/utils/util'
import type {
  YoutubeApiThumbnailsType,
  YoutubeApiVideoType,
  YoutubeFeedEntryType,
} from '@/services/api/youtube/types/youtubeApiType'
import type {
  StorageLocalTypes,
  YoutubeLivesCacheStore,
  YoutubeSubscriptionsCacheStore,
} from '@/types/localStorageKeysTypes'
import { STORAGE_KEY_YOUTUBE_LIVES_CACHE, STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE } from '@/types/localStorageKeysTypes'

const FEED_ORIGIN = 'https://www.youtube.com/*'
// Google implicit flow tokens last 1 hour, they are renewed a bit before that
export const YOUTUBE_TOKEN_LIFETIME = 55 * 60 * 1000
// The YouTube API quota is small, so the data is reused for a while
const SUBSCRIPTIONS_CACHE_TIME = 30 * 60 * 1000
const LIVES_CACHE_TIME = 2 * 60 * 1000
// Lives are published on the feed when they are scheduled, usually some days before they start
const FEED_WINDOW = 7 * 24 * 60 * 60 * 1000
const FEED_CONCURRENCY = 8
// Upcoming lives this late are usually abandoned schedules or permanent waiting rooms
const UPCOMING_LATE_LIMIT = 24 * 60 * 60 * 1000

export type YoutubeLivesFollowed = {
  onlines: StreamItemLiveOnlineType[]
  upcomings: StreamItemLiveUpcomingType[]
  // Without the youtube.com permission the feeds can't be read, so no live is found
  missingPermission: boolean
}

function thumbnailUrl(thumbnails: YoutubeApiThumbnailsType): string | undefined {
  return (thumbnails.medium ?? thumbnails.high ?? thumbnails.default)?.url
}

function youtubeVideoToStreamOnline(value: YoutubeApiVideoType): StreamItemLiveOnlineType {
  const image = thumbnailUrl(value.snippet.thumbnails)
  const viewerCount = Number(value.liveStreamingDetails?.concurrentViewers)

  return {
    type: 'youtube',
    status: 'online',
    id: value.snippet.channelId,
    login: value.snippet.channelId,
    name: value.snippet.channelTitle,
    title: value.snippet.title,
    viewerCount: Number.isNaN(viewerCount) ? undefined : viewerCount,
    startedAt: moment(value.liveStreamingDetails?.actualStartTime ?? value.snippet.publishedAt),
    // The live thumbnail keeps the same url while its image changes
    previewImage: image ? (_width, _height, dump) => (dump ? `${image}?dump=${dump}` : image) : undefined,
    verified: false,
    videoId: value.id,
  }
}
function youtubeVideoToStreamUpcoming(value: YoutubeApiVideoType): StreamItemLiveUpcomingType {
  return {
    type: 'youtube',
    status: 'upcoming',
    id: value.snippet.channelId,
    login: value.snippet.channelId,
    name: value.snippet.channelTitle,
    title: value.snippet.title,
    scheduledAt: moment(value.liveStreamingDetails?.scheduledStartTime ?? value.snippet.publishedAt),
    previewImage: thumbnailUrl(value.snippet.thumbnails),
    verified: false,
    videoId: value.id,
  }
}

/**
 * Only one item for each channel, as the list shows channels: the live with more viewers, or else the next upcoming.
 */
function videosToLives(videos: YoutubeApiVideoType[]): Omit<YoutubeLivesFollowed, 'missingPermission'> {
  const onlines = uniqBy(
    orderBy(
      videos.filter((value) => value.snippet.liveBroadcastContent === 'live').map(youtubeVideoToStreamOnline),
      [(value) => value.viewerCount ?? 0],
      ['desc']
    ),
    'id'
  )
  const upcomings = uniqBy(
    orderBy(
      videos
        .filter((value) => value.snippet.liveBroadcastContent === 'upcoming')
        .map(youtubeVideoToStreamUpcoming)
        .filter((value) => moment().diff(value.scheduledAt) < UPCOMING_LATE_LIMIT)
        .filter((value) => !onlines.some((online) => online.id === value.id)),
      [(value) => value.scheduledAt.valueOf()],
      ['asc']
    ),
    'id'
  )

  return { onlines, upcomings }
}

async function readSubscriptionsCache(accountId: string): Promise<YoutubeSubscriptionsCacheStore | undefined> {
  const storage = (await browser.storage.local.get(
    STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE
  )) as Partial<StorageLocalTypes>
  const cache = storage[STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE]
  return cache?.accountId === accountId ? cache : undefined
}
async function readLivesCache(accountId: string): Promise<YoutubeLivesCacheStore> {
  const storage = (await browser.storage.local.get(STORAGE_KEY_YOUTUBE_LIVES_CACHE)) as Partial<StorageLocalTypes>
  const cache = storage[STORAGE_KEY_YOUTUBE_LIVES_CACHE]
  return cache?.accountId === accountId ? cache : { accountId, videos: [], finished: {} }
}

const YoutubeBusiness = {
  async auth(forceVerify?: boolean, interactive?: boolean): Promise<{ token: string; user: User; expiresAt: number }> {
    // Must be the first call, the browser only shows the permission prompt while handling the user click
    if (interactive !== false) await this.requestFeedPermission()

    const message: AuthBackgroundMessageType = {
      type: 'auth',
      authType: 'youtube',
      forceVerify,
      interactive,
    }
    const accessToken: string = await browser.runtime.sendMessage(message)
    const expiresAt = Date.now() + YOUTUBE_TOKEN_LIFETIME
    const user = await this.getSelfUser(accessToken)

    return { token: accessToken, user, expiresAt }
  },
  async revoke(token: string) {
    const message: RevokeBackgroundMessageType = {
      type: 'revoke',
      authType: 'youtube',
      token,
    }
    await browser.runtime.sendMessage(message)
    await browser.storage.local.remove([STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE, STORAGE_KEY_YOUTUBE_LIVES_CACHE])
  },
  async requestFeedPermission(): Promise<boolean> {
    return browser.permissions.request({ origins: [FEED_ORIGIN] })
  },
  async hasFeedPermission(): Promise<boolean> {
    return browser.permissions.contains({ origins: [FEED_ORIGIN] })
  },
  async getSelfUser(token: string): Promise<User> {
    const channel = await YoutubeApi.channels.self(token)

    return {
      type: 'youtube',
      id: channel?.id ?? '',
      name: channel?.snippet.title ?? 'YouTube',
      login: channel?.snippet.customUrl ?? channel?.id ?? '',
      avatarUrl: channel && thumbnailUrl(channel.snippet.thumbnails),
    }
  },
  async getStreamersFollowed(token: string, accountId: string, force?: boolean): Promise<StreamItemLiveStreamType[]> {
    const cache = await readSubscriptionsCache(accountId)
    if (!force && cache && Date.now() - cache.fetchedAt < SUBSCRIPTIONS_CACHE_TIME) return cache.items

    const subscriptions = await YoutubeApi.subscriptions.mine(token)
    const items: StreamItemLiveStreamType[] = subscriptions.map((value) => ({
      type: 'youtube',
      status: 'stream',
      id: value.snippet.resourceId.channelId,
      login: value.snippet.resourceId.channelId,
      name: value.snippet.title,
      profileImage: thumbnailUrl(value.snippet.thumbnails),
      verified: false,
    }))

    const newCache: YoutubeSubscriptionsCacheStore = { accountId, fetchedAt: Date.now(), items }
    await browser.storage.local.set({ [STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE]: newCache })

    return items
  },
  /**
   * The search endpoint costs 100 quota units by call, so the recent videos come from the free RSS feeds and only
   * them are checked with the videos endpoint (1 unit for 50 videos).
   * Videos that will never be live are remembered, so each video is usually checked only once.
   */
  async getLivesFollowed(
    token: string,
    accountId: string,
    channelIds: string[],
    force?: boolean
  ): Promise<YoutubeLivesFollowed> {
    const cache = await readLivesCache(accountId)
    if (!force && cache.fetchedAt && Date.now() - cache.fetchedAt < LIVES_CACHE_TIME)
      return { ...videosToLives(cache.videos), missingPermission: false }

    if (!(await this.hasFeedPermission())) return { onlines: [], upcomings: [], missingPermission: true }

    const now = Date.now()
    const feeds = await mapConcurrent(channelIds, FEED_CONCURRENCY, async (channelId) =>
      // A failed feed (like a deleted channel) must not hide the lives of the other channels
      YoutubeApi.feeds.videos(channelId).catch((): YoutubeFeedEntryType[] => [])
    )
    const entries = feeds.flat().filter((value) => now - Date.parse(value.published) < FEED_WINDOW)

    const finished = pickBy(cache.finished, (published) => now - published < FEED_WINDOW)
    const ids = uniq(entries.map((value) => value.videoId)).filter((id) => !(id in finished))
    const videos = ids.length ? await YoutubeApi.videos.videosByIds(token, ids) : []

    for (const entry of entries) {
      if (entry.videoId in finished) continue
      const video = videos.find((value) => value.id === entry.videoId)
      // Missing videos are private or deleted
      if (!video || video.snippet.liveBroadcastContent === 'none') finished[entry.videoId] = Date.parse(entry.published)
    }

    const lives = videos.filter((value) => value.snippet.liveBroadcastContent !== 'none')
    const newCache: YoutubeLivesCacheStore = { accountId, fetchedAt: now, videos: lives, finished }
    await browser.storage.local.set({ [STORAGE_KEY_YOUTUBE_LIVES_CACHE]: newCache })

    return { ...videosToLives(lives), missingPermission: false }
  },
}

export default YoutubeBusiness
