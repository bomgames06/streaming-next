import { mockHttp } from '@tests/__utils__/http'
import type {
  YoutubeApiChannelType,
  YoutubeApiSubscriptionType,
  YoutubeApiVideoType,
} from '@/services/api/youtube/types/youtubeApiType'
import type { AccountStore } from '@/store/system/types/systemStoreType'
import { account } from '@tests/__utils__/fixtures'

export const YOUTUBE_API_URL = import.meta.env.VITE_APP_API_YOUTUBE_URL
export const YOUTUBE_FEED_URL = `${import.meta.env.VITE_APP_FEED_YOUTUBE_URL}/videos.xml`

export function youtubeAccount(override?: Partial<AccountStore>): AccountStore {
  return account({
    id: 'yt-uuid',
    type: 'youtube',
    accountId: 'UCme',
    name: 'My channel',
    login: '@me',
    token: 'yt-token',
    // Far from expiring, so no renew is attempted
    expiresAt: Date.now() + 60 * 60 * 1000,
    ...override,
  })
}

export function apiYoutubeChannel(override?: Partial<YoutubeApiChannelType>): YoutubeApiChannelType {
  return {
    id: 'UCme',
    snippet: {
      title: 'My channel',
      customUrl: '@me',
      thumbnails: { default: { url: 'https://yt3/me-88.jpg' }, medium: { url: 'https://yt3/me-240.jpg' } },
    },
    ...override,
  }
}
export function apiYoutubeSubscription(channelId: string, title: string): YoutubeApiSubscriptionType {
  return {
    id: `sub-${channelId}`,
    snippet: {
      title,
      resourceId: { kind: 'youtube#channel', channelId },
      thumbnails: { medium: { url: `https://yt3/${channelId}.jpg` } },
    },
  }
}
export function apiYoutubeVideo(
  id: string,
  channelId: string,
  override?: {
    liveBroadcastContent?: YoutubeApiVideoType['snippet']['liveBroadcastContent']
    title?: string
    channelTitle?: string
    liveStreamingDetails?: YoutubeApiVideoType['liveStreamingDetails']
  }
): YoutubeApiVideoType {
  return {
    id,
    snippet: {
      channelId,
      channelTitle: override?.channelTitle ?? `Channel ${channelId}`,
      title: override?.title ?? `Video ${id}`,
      publishedAt: '2026-10-20T10:00:00Z',
      thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } },
      liveBroadcastContent: override?.liveBroadcastContent ?? 'none',
    },
    liveStreamingDetails: override?.liveStreamingDetails,
  }
}

export type YoutubeFeedEntry = { videoId: string; published: string }
export function youtubeFeedXml(channelId: string, entries: YoutubeFeedEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <yt:channelId>${channelId}</yt:channelId>
  <published>2011-07-26T21:02:26+00:00</published>
  ${entries
    .map(
      (entry) => `<entry>
    <id>yt:video:${entry.videoId}</id>
    <yt:videoId>${entry.videoId}</yt:videoId>
    <yt:channelId>${channelId}</yt:channelId>
    <published>${entry.published}</published>
    <media:group><media:statistics views="0"/></media:group>
  </entry>`
    )
    .join('\n')}
</feed>`
}

export type YoutubeServerData = {
  me?: YoutubeApiChannelType
  subscriptions?: YoutubeApiSubscriptionType[]
  // Feed entries by channel id, a channel without an entry answers 404 like a deleted channel
  feeds?: Record<string, YoutubeFeedEntry[]>
  videos?: YoutubeApiVideoType[]
  // Page size of the subscriptions, to exercise the pagination
  subscriptionsPageSize?: number
}

/**
 * In-memory YouTube Data API and RSS feeds on top of mockHttp. Pass the http of another server (like twitchServer)
 * to answer both, as only one mocked network layer is active at a time.
 */
export function youtubeServer(initial?: YoutubeServerData, http = mockHttp()) {
  const data: YoutubeServerData = { me: apiYoutubeChannel(), ...initial }

  http
    .get(`${YOUTUBE_API_URL}/channels`, () => ({ data: { items: data.me ? [data.me] : [] } }))
    .get(`${YOUTUBE_API_URL}/subscriptions`, (request) => {
      const items = data.subscriptions || []
      const size = data.subscriptionsPageSize || 50
      const start = Number(request.query.get('pageToken') || 0)
      const next = start + size < items.length ? String(start + size) : undefined
      return { data: { items: items.slice(start, start + size), nextPageToken: next } }
    })
    .get(`${YOUTUBE_API_URL}/videos`, (request) => {
      const ids = (request.query.get('id') || '').split(',')
      return { data: { items: (data.videos || []).filter((video) => ids.includes(video.id)) } }
    })
    .get(YOUTUBE_FEED_URL, (request) => {
      const channelId = request.query.get('channel_id') || ''
      const entries = data.feeds?.[channelId]
      if (!entries) return { status: 404, text: 'Not found' }
      return { text: youtubeFeedXml(channelId, entries) }
    })

  const requestsTo = (url: string) => http.requests.filter((request) => request.url === url)
  return {
    http,
    data,
    videoRequests: () => requestsTo(`${YOUTUBE_API_URL}/videos`),
    feedRequests: () => requestsTo(YOUTUBE_FEED_URL),
    subscriptionRequests: () => requestsTo(`${YOUTUBE_API_URL}/subscriptions`),
  }
}
