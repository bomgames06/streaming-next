import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'

export type AccountStoreType = 'twitch' | 'youtube'
export const ACCOUNT_STORE_TYPES: AccountStoreType[] = ['twitch', 'youtube']
export type AccountStore = {
  id: string
  type: AccountStoreType
  accountId: string
  name: string
  login: string
  avatarUrl?: string
  token: string
  // Epoch in ms, only for the tokens of the code flow (they expire in hours)
  expiresAt?: number
  // Renews the expired token without the user, through streaming-next-back
  refreshToken?: string
  invalid: boolean
}
export type AccountDataStore = {
  [key in AccountStoreType]?: AccountStore
}
export type AccountCacheStreamsDataStore = {
  [key in AccountStoreType]?: StreamItemLiveStreamType[]
}
export type NotificationStore = {
  type: AccountStoreType
  id: string
}
export type FavoriteStore = {
  type: AccountStoreType
  id: string
}
export type CategoryNotificationStreamStore = {
  type: AccountStoreType
  id: string
}
export type CategoryNotificationStore = {
  id: string
  name: string
  imageUrl?: string
  streams: CategoryNotificationStreamStore[]
}
export type ViewDataStore = {
  categoryId?: string
}
export type NotificationTypeStore = 'all' | 'partial' | 'none'
export const DEFAULT_NOTIFICATION_TYPE: NotificationTypeStore = 'partial'
export type ScreenStore = 'loading' | 'auth' | 'home'
export type ViewStore = 'streams' | 'categories' | 'search' | 'settings'
export type StreamOrderStore = 'name' | 'view' | 'game'
export type StreamOrderSortStore = boolean
export type HeaderAppBarViewStore = 'video' | 'clip' | 'categoryStreams'
export type VideoOrderStore = 'time' | 'trending' | 'views'
export type ClipPeriodStore = '24h' | '7d' | '30d' | 'all'
export type LanguageCategoryStreamStore = 'pt' | 'en' | 'ko' | 'ja' | 'ru' | 'zh'

export type GroupStreamStore = {
  id: string
  name: string
  streams: {
    type: AccountStoreType
    id: string
  }[]
}

export type FavoriteGroup = {
  type: AccountStoreType
  id: string
  name: string
}
