import type {
  AccountDataStore,
  CategoryNotificationStore,
  FavoriteStore,
  GroupStreamStore,
  NotificationStore,
  NotificationTypeStore,
  StreamOrderStore,
} from '@/store/system/types/systemStoreType'
import type { Locales } from '@/plugins/i18n'

export const STORAGE_KEY_ACCOUNTS = 'accounts' as const
export const STORAGE_KEY_NOTIFICATIONS = 'notifications' as const
export const STORAGE_KEY_NOTIFICATION_TYPE = 'notificationType' as const
export const STORAGE_KEY_DARK = 'dark' as const
export const STORAGE_KEY_LANGUAGE = 'language' as const
export const STORAGE_KEY_SHOW_ALWAYS_OFFLINES = 'showAlwaysOfflines' as const
export const STORAGE_KEY_SHOW_NO_GROUP = 'showNoGroup' as const
export const STORAGE_KEY_STREAM_ORDER = 'streamOrder' as const
export const STORAGE_KEY_STREAM_ORDER_SORT = 'streamOrderSort' as const
export const STORAGE_KEY_SHOW_GROUPS = 'showGroups' as const
export const STORAGE_KEY_SHOW_FAVORITES = 'showFavorites' as const
export const STORAGE_KEY_SHOW_NOTIFICATIONS = 'showNotifications' as const
export const STORAGE_KEY_FAVORITES = 'favorites' as const
export const STORAGE_KEY_CATEGORY_NOTIFICATIONS = 'categoryNotifications' as const
export const STORAGE_KEY_GROUP_STREAMS = 'groupStreams' as const
export const STORAGE_KEY_GROUP_EXPANDED = 'groupExpanded' as const

export type StorageSyncTypes = {
  [STORAGE_KEY_ACCOUNTS]: AccountDataStore
  [STORAGE_KEY_NOTIFICATIONS]: NotificationStore[]
  [STORAGE_KEY_NOTIFICATION_TYPE]: NotificationTypeStore
  [STORAGE_KEY_FAVORITES]: FavoriteStore[]
  [STORAGE_KEY_DARK]: boolean
  [STORAGE_KEY_LANGUAGE]: Locales
  [STORAGE_KEY_SHOW_ALWAYS_OFFLINES]: boolean
  [STORAGE_KEY_SHOW_NO_GROUP]: boolean
  [STORAGE_KEY_STREAM_ORDER]: StreamOrderStore
  [STORAGE_KEY_STREAM_ORDER_SORT]: boolean
  [STORAGE_KEY_SHOW_GROUPS]: boolean
  [STORAGE_KEY_SHOW_FAVORITES]: boolean
  [STORAGE_KEY_SHOW_NOTIFICATIONS]: boolean
  [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: CategoryNotificationStore[]
  [STORAGE_KEY_GROUP_STREAMS]: GroupStreamStore[]
  [STORAGE_KEY_GROUP_EXPANDED]: string[]
}
