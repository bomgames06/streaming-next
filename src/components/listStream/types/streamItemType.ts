import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import type { Moment } from 'moment'

export type StreamItemLiveOnlineType = {
  id: string
  status: 'online'
  login: string
  name: string
  title?: string
  viewerCount?: number
  type: Extract<AccountStoreType, 'twitch' | 'youtube'>
  previewImage?: ((width: number, height: number, dump?: string) => string) | string
  gameId?: string
  game?: string
  startedAt: Moment
  verified: boolean
  // YouTube lives are videos of the channel, the item id stays the channel id
  videoId?: string
}
export type StreamItemLiveUpcomingType = {
  id: string
  status: 'upcoming'
  login: string
  name: string
  title?: string
  type: Extract<AccountStoreType, 'youtube'>
  previewImage?: string
  scheduledAt: Moment
  verified: boolean
  videoId: string
}
export type StreamItemLiveOfflineType = {
  id: string
  type: AccountStoreType
  status: 'offline'
  login: string
  name: string
  profileImage?: string
  verified: boolean
}
export type StreamItemLiveStreamType = {
  id: string
  type: AccountStoreType
  status: 'stream'
  login: string
  name: string
  profileImage?: string
  verified: boolean
}
export type StreamItemVideoType = {
  id: string
  status: 'video'
  name: string
  login: string
  viewerCount: number
  duration: number
  createdAt: Moment
  url: string
  title?: string
} & {
  type: Extract<AccountStoreType, 'twitch'>
  previewImage?: (width: number, height: number, dump?: string) => string
}
export type StreamItemClipType = {
  id: string
  status: 'clip'
  name: string
  login: string
  viewerCount: number
  duration: number
  createdAt: Moment
  url: string
  title?: string
} & {
  type: Extract<AccountStoreType, 'twitch'>
  previewImage?: string
}
export type StreamItemLiveType =
  StreamItemLiveOnlineType | StreamItemLiveUpcomingType | StreamItemLiveOfflineType | StreamItemLiveStreamType
export type CategorySearchItem = {
  type: AccountStoreType
  id: string
  name: string
  imageUrl: string
}

export type StreamItemType = StreamItemLiveType | StreamItemVideoType | StreamItemClipType

export const isOnlineStream = (item: StreamItemType): item is StreamItemLiveOnlineType => item.status === 'online'
export const isUpcomingStream = (item: StreamItemType): item is StreamItemLiveUpcomingType => item.status === 'upcoming'
export const isOfflineStream = (item: StreamItemType): item is StreamItemLiveOfflineType | StreamItemLiveStreamType =>
  item.status === 'offline' || item.status === 'stream'
export const isStream = (item: StreamItemType): item is StreamItemLiveType =>
  item.status === 'online' || item.status === 'upcoming' || item.status === 'offline' || item.status === 'stream'
export const isContentStream = (item: StreamItemType): item is StreamItemVideoType | StreamItemClipType =>
  item.status === 'video' || item.status === 'clip'
