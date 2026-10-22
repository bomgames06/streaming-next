import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import { browser } from 'wxt/browser'
import type { StorageSyncTypes } from '@/types/syncStorageKeysTypes'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
} from '@/types/syncStorageKeysTypes'
import type {
  AccountDataStore,
  AccountStoreType,
  CategoryNotificationStore,
  NotificationStore,
  NotificationTypeStore,
} from '@/store/system/types/systemStoreType'
import { DEFAULT_NOTIFICATION_TYPE } from '@/store/system/types/systemStoreType'
import type { StorageSessionTypes } from '@/types/sessionStorageKeysTypes'
import { STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED } from '@/types/sessionStorageKeysTypes'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type { User } from '@/types/userType'
import { HttpStatusCode, isAxiosError } from 'axios'
import type { FetchAccountsApplicationMessageType } from '@/background/types/backgroundMessageType'
import { generateState, isSameCategoryName, twitchUrl } from '@/utils/util'
import countHandler from '@/background/handlers/countHandler'
import { uniqBy } from 'lodash'

export type OnlineHistory = {
  twitch: { id: string; category: string }[]
}

const NOTIFICATION_ID_REGEX = /^([a-zA-Z0-9]{10})-N-(.+)-(.+)$/
const FALLBACK_ICON_URL = '/icons/128.png'

export default async function notificationHandler(onlines: StreamItemLiveOnlineType[]) {
  const syncStorage = (await browser.storage.sync.get([
    STORAGE_KEY_NOTIFICATION_TYPE,
    STORAGE_KEY_NOTIFICATIONS,
    STORAGE_KEY_ACCOUNTS,
    STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  ])) as Partial<StorageSyncTypes>

  const accounts: AccountDataStore = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
  if (!accounts.twitch || accounts.twitch.invalid) return

  const sessionStorage = (await browser.storage.session.get([
    STORAGE_KEY_ONLINE_HISTORY,
    STORAGE_KEY_STARTED,
  ])) as Partial<StorageSessionTypes>

  const onlineHistory: OnlineHistory = sessionStorage[STORAGE_KEY_ONLINE_HISTORY] ?? { twitch: [] }
  const notificationType: NotificationTypeStore =
    syncStorage[STORAGE_KEY_NOTIFICATION_TYPE] ?? DEFAULT_NOTIFICATION_TYPE
  const notifications: NotificationStore[] = syncStorage[STORAGE_KEY_NOTIFICATIONS] ?? []
  const categoryNotifications: CategoryNotificationStore[] = syncStorage[STORAGE_KEY_CATEGORY_NOTIFICATIONS] ?? []
  const started: boolean = sessionStorage[STORAGE_KEY_STARTED] ?? false

  if (started && notificationType !== 'none') {
    const onlinesFiltered = uniqBy(
      onlines.filter(
        (online) =>
          checkOnlineNotification(notificationType, notifications, online, onlineHistory) ||
          checkCategoryNotification(categoryNotifications, online, onlineHistory)
      ),
      (item) => `${item.type}:${item.id}`
    )

    if (onlinesFiltered.length) {
      let users: User[]
      try {
        users = await TwitchBusiness.getUsersByIds(
          accounts.twitch.token,
          onlinesFiltered.map((value) => value.id)
        )
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized) {
          accounts.twitch.invalid = true
          await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
          await countHandler(accounts, onlines.length)

          const message: FetchAccountsApplicationMessageType = { type: 'fetchAccounts' }
          // The popup may be closed, so there may be no receiver for this message
          browser.runtime.sendMessage(message).catch(() => undefined)
        }
        return
      }

      for (const online of onlinesFiltered) {
        const user = users.find((value) => value.id === online.id)
        if (!user) continue

        void browser.notifications.create(`${generateState(10)}-N-${online.type}-${online.login}`, {
          type: 'basic',
          iconUrl: user.avatarUrl || browser.runtime.getURL(FALLBACK_ICON_URL),
          title: online.name,
          message: online.title || '',
          contextMessage: online.game || undefined,
        })
      }
    }
  }

  onlineHistory.twitch = onlines.map((value) => ({ id: value.id, category: value.game || '' }))
  await browser.storage.session.set({ [STORAGE_KEY_ONLINE_HISTORY]: onlineHistory, [STORAGE_KEY_STARTED]: true })
}

export function registerNotificationHandler() {
  browser.notifications.onClicked.addListener((notificationId) => {
    const match = notificationId.match(NOTIFICATION_ID_REGEX)
    if (match && match[3] && match[2] === ('twitch' as AccountStoreType))
      void browser.tabs.create({ url: twitchUrl(match[3]) })
    void browser.notifications.clear(notificationId)
  })
}

function checkCategoryNotification(
  categoryNotifications: CategoryNotificationStore[],
  online: StreamItemLiveOnlineType,
  onlineHistory: OnlineHistory
): boolean {
  if (!online.game) return false
  return (
    categoryNotifications.some(
      (value) =>
        isSameCategoryName(value.name, online.game) &&
        (!value.streams.length ||
          value.streams.some((stream) => stream.id === online.id && stream.type === online.type))
    ) &&
    !onlineHistory.twitch.some((value) => value.id === online.id && isSameCategoryName(value.category, online.game))
  )
}

function checkOnlineNotification(
  notificationType: NotificationTypeStore,
  notifications: NotificationStore[],
  online: StreamItemLiveOnlineType,
  onlineHistory: OnlineHistory
): boolean {
  return (
    (notificationType === 'all' ||
      notifications.some((value) => value.type === online.type && value.id === online.id)) &&
    !onlineHistory.twitch.some((value) => value.id === online.id)
  )
}
