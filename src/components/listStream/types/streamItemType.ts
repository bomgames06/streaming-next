import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import type { Moment } from 'moment'

export type StreamItemLiveOnlineType = {
  id: string
  status: 'online'
  login: string
  name: string
  title?: string
  viewerCount?: number
  type: Extract<AccountStoreType, 'twitch'>
  previewImage?: ((width: number, height: number, dump?: string) => string) | string
  gameId?: string
  game?: string
  startedAt: Moment
  verified: boolean
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
export type StreamItemLiveType = StreamItemLiveOnlineType | StreamItemLiveOfflineType | StreamItemLiveStreamType
export type CategorySearchItem = {
  id: string
  name: string
  imageUrl: string
}

export type StreamItemType = StreamItemLiveType | StreamItemVideoType | StreamItemClipType

export const isOnlineStream = (item: StreamItemType): item is StreamItemLiveOnlineType => item.status === 'online'
export const isOfflineStream = (item: StreamItemType): item is StreamItemLiveOfflineType | StreamItemLiveStreamType =>
  item.status === 'offline' || item.status === 'stream'
export const isStream = (
  item: StreamItemType
): item is StreamItemLiveOnlineType | StreamItemLiveOfflineType | StreamItemLiveStreamType =>
  item.status === 'online' || item.status === 'offline' || item.status === 'stream'
export const isContentStream = (item: StreamItemType): item is StreamItemVideoType | StreamItemClipType =>
  item.status === 'video' || item.status === 'clip'
