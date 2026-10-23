import type { YoutubeApiVideoType } from '@/services/api/youtube/types/youtubeApiType'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'

export const STORAGE_KEY_ACCOUNTS_CACHE_STREAMS = 'accountsCacheStreams' as const
// Split in two keys because subscriptions and lives are fetched at the same time
export const STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE = 'youtubeSubscriptionsCache' as const
export const STORAGE_KEY_YOUTUBE_LIVES_CACHE = 'youtubeLivesCache' as const

export type YoutubeSubscriptionsCacheStore = {
  // Account the cache belongs to, the cache of another account is discarded
  accountId: string
  fetchedAt: number
  items: StreamItemLiveStreamType[]
}
export type YoutubeLivesCacheStore = {
  accountId: string
  fetchedAt?: number
  // Live and upcoming videos of the last fetch
  videos: YoutubeApiVideoType[]
  // Videos that will never be live (normal videos and ended lives) by id, with the published epoch to expire them
  finished: Record<string, number>
}

export type StorageLocalTypes = {
  [STORAGE_KEY_YOUTUBE_SUBSCRIPTIONS_CACHE]: YoutubeSubscriptionsCacheStore
  [STORAGE_KEY_YOUTUBE_LIVES_CACHE]: YoutubeLivesCacheStore
}
