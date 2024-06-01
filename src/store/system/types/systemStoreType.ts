export type AccountStoreType = 'twitch'
export type AccountStore<T extends AccountStoreType = AccountStoreType> = {
  id: string
  type: T
  accountId: string
  name: string
  login: string
  avatarUrl?: string
  token: string
  invalid: boolean
}
export type AccountDataStore = {
  [key in AccountStoreType]?: AccountStore<key>
}
export type NotificationStore = {
  type: AccountStoreType
  id: string
}
export type ViewDataStore = {
  categoryId?: string
}
export type NotificationTypeStore = 'all' | 'partial' | 'none'
export type ScreenStore = 'loading' | 'auth' | 'home'
export type ViewStore = 'streams' | 'categories' | 'search' | 'settings'
export type StreamOrderStore = 'name' | 'view' | 'game'
export type StreamOrderSortStore = boolean
export type HeaderAppBarViewStore = 'video' | 'clip' | 'categoryStreams'
export type VideoOrderStore = 'time' | 'trending' | 'views'
export type ClipPeriodStore = '24h' | '7d' | '30d' | 'all'
export type LanguageCategoryStreamStore = 'pt' | 'en' | 'ko' | 'ja' | 'ru' | 'zh'
