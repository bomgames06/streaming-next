import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import type { Moment } from 'moment'

export type StreamItemLiveOnlineType = {
  id: string
  status: 'online'
  login: string
  name: string
  gameId?: string
  game?: string
  startedAt: Moment
  viewerCount?: number
  title?: string
} & {
  type: Extract<AccountStoreType, 'twitch'>
  previewImage?: ((width: number, height: number, dump?: string) => string) | string
}
export type StreamItemLiveOfflineType = {
  id: string
  type: AccountStoreType
  status: 'offline'
  login: string
  name: string
  profileImage?: string
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
export type StreamItemLiveType = StreamItemLiveOnlineType | StreamItemLiveOfflineType

export type StreamItemType = StreamItemLiveType | StreamItemVideoType | StreamItemClipType
