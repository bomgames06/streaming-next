import type { OnlineHistory } from '@/background/handlers/notificationHandler'

export const STORAGE_KEY_ONLINE_HISTORY = 'onlyHistory' as const
export const STORAGE_KEY_STARTED = 'started' as const

export type StorageSessionTypes = {
  [STORAGE_KEY_ONLINE_HISTORY]: OnlineHistory
  [STORAGE_KEY_STARTED]: boolean
}
