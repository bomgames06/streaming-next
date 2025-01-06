import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import browser from 'webextension-polyfill'
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
import type { StorageSessionTypes } from '@/types/sessionStorageKeysTypes'
import { STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED } from '@/types/sessionStorageKeysTypes'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type { User } from '@/types/userType'
import { HttpStatusCode, isAxiosError } from 'axios'
import type { FetchAccountsApplicationMessageType } from '@/background/types/backgroundMessageType'
import { generateState, twitchUrl } from '@/utils/util'
import { uniqBy, upperCase } from 'lodash'

export type OnlineHistory = {
  twitch: { id: string; category: string }[]
}

export default async function notificationHandler(onlines: StreamItemLiveOnlineType[]) {
  const syncStorage: StorageSyncTypes = (await browser.storage.sync.get([
    STORAGE_KEY_NOTIFICATION_TYPE,
    STORAGE_KEY_NOTIFICATIONS,
    STORAGE_KEY_ACCOUNTS,
    STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  ])) as StorageSyncTypes

  const accounts: AccountDataStore = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
  if (!accounts.twitch || accounts.twitch.invalid) return

  const sessionStorage: StorageSessionTypes = (await browser.storage.session.get([
    STORAGE_KEY_ONLINE_HISTORY,
    STORAGE_KEY_STARTED,
  ])) as StorageSessionTypes

  const onlineHistory: OnlineHistory = sessionStorage[STORAGE_KEY_ONLINE_HISTORY] ?? { twitch: [] }
  const notificationType: NotificationTypeStore = syncStorage[STORAGE_KEY_NOTIFICATION_TYPE] ?? 'none'
  const notifications: NotificationStore[] = syncStorage[STORAGE_KEY_NOTIFICATIONS] ?? []
  const categoryNotifications: CategoryNotificationStore[] = syncStorage[STORAGE_KEY_CATEGORY_NOTIFICATIONS] ?? []
  let started: boolean = sessionStorage[STORAGE_KEY_STARTED] ?? false

  if (started && notificationType !== 'none') {
    const onlinesFiltered = onlines.filter(
      (online) =>
        checkOnlineNotification(notificationType, notifications, online, onlineHistory) ||
        checkCategoryNotification(categoryNotifications, online, onlineHistory)
    )
    let users: User[]
    try {
      users = await TwitchBusiness.getUsersByIds(
        accounts.twitch.token,
        onlinesFiltered.map((value) => value.id)
      )
    } catch (e) {
      if (accounts.twitch && isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized) {
        accounts.twitch.invalid = true
        await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })

        const message: FetchAccountsApplicationMessageType = { type: 'fetchAccounts' }
        void browser.runtime.sendMessage(message)
      }
      return
    }

    uniqBy(onlinesFiltered, (item) => `${item.type}:${item.id}`).forEach((online) => {
      const user = users.find((value) => value.id === online.id)
      if (!user) return

      browser.notifications.create(`${generateState(10)}-N-${online.type}-${online.login}`, {
        type: 'basic',
        iconUrl: user.avatarUrl,
        title: online.name,
        message: online.title || '',
        contextMessage: online.game || undefined,
      })
    })
  }

  onlineHistory.twitch = onlines.map((value) => ({ id: value.id, category: value.game || '' }))
  await browser.storage.session.set({ [STORAGE_KEY_ONLINE_HISTORY]: onlineHistory })

  started = true
  await browser.storage.session.set({ [STORAGE_KEY_STARTED]: started })
}

browser.notifications.onClicked.addListener((notificationId) => {
  const match = notificationId.match(/^([a-zA-Z0-9]{10})-N-(.+)-(.+)$/)
  if (match && match[3]) {
    if (match[2] === ('twitch' as AccountStoreType)) void browser.tabs.create({ url: twitchUrl(match[3]) })
  }
})

function checkCategoryNotification(
  categoryNotifications: CategoryNotificationStore[],
  online: StreamItemLiveOnlineType,
  onlineHistory: OnlineHistory
): unknown {
  return (
    categoryNotifications.some(
      (value) =>
        upperCase(value.name) === upperCase(online.game) &&
        (!value.streams.length ||
          value.streams.some((stream) => stream.id === online.id && stream.type === online.type))
    ) &&
    !onlineHistory.twitch.some(
      (value) => value.id === online.id && upperCase(value.category) === upperCase(online.game)
    )
  )
}

function checkOnlineNotification(
  notificationType: string,
  notifications: NotificationStore[],
  online: StreamItemLiveOnlineType,
  onlineHistory: OnlineHistory
): unknown {
  return (
    (notificationType === 'all' ||
      notifications.some((value) => value.type === online.type && value.id === online.id)) &&
    !onlineHistory.twitch.some((value) => value.id === online.id)
  )
}
