import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import browser from 'webextension-polyfill'
import type { StorageSyncTypes } from '@/types/syncStorageKeysTypes'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
} from '@/types/syncStorageKeysTypes'
import type {
  AccountDataStore,
  AccountStoreType,
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
import { uniqBy } from 'lodash'

export type OnlineHistory = {
  twitch: string[]
}

export default async function notificationHandler(onlines: StreamItemLiveOnlineType[]) {
  const syncStorage: StorageSyncTypes = (await browser.storage.sync.get([
    STORAGE_KEY_NOTIFICATION_TYPE,
    STORAGE_KEY_NOTIFICATIONS,
    STORAGE_KEY_ACCOUNTS,
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
  let started: boolean = sessionStorage[STORAGE_KEY_STARTED] ?? false

  if (started && notificationType !== 'none') {
    const onlinesFiltered = onlines.filter(
      (online) =>
        (notificationType === 'all' ||
          notifications.some((value) => value.type === 'twitch' && value.id === online.id)) &&
        !onlineHistory.twitch.some((value) => value === online.id)
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
      })
    })
  }

  onlineHistory.twitch = onlines.map((value) => value.id)
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
