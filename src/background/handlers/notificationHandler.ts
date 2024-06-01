import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import browser from 'webextension-polyfill'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
} from '@/types/syncStorageKeysTypes'
import type { AccountDataStore, NotificationStore, NotificationTypeStore } from '@/store/system/types/systemStoreType'
import { STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED } from '@/types/sessionStorageKeysTypes'
import TwitchBusiness from '@/services/business/twitchBusiness'
import { HttpStatusCode, isAxiosError } from 'axios'
import type { FetchAccountsApplicationMessageType } from '@/background/types/backgroundMessageType'
import type { User } from '@/types/userType'

type OnlineHistory = {
  twitch: string[]
}

export default async function notificationHandler(onlines: StreamItemLiveOnlineType[]) {
  const syncStorage = await browser.storage.sync.get([
    STORAGE_KEY_NOTIFICATION_TYPE,
    STORAGE_KEY_NOTIFICATIONS,
    STORAGE_KEY_ACCOUNTS,
  ])

  const accounts: AccountDataStore = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
  if (!accounts.twitch || accounts.twitch.invalid) return

  const sessionStorage = await browser.storage.session.get([STORAGE_KEY_ONLINE_HISTORY, STORAGE_KEY_STARTED])

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
      if (accounts.twitch && isAxiosError(e) && e.status === HttpStatusCode.Unauthorized) {
        accounts.twitch.invalid = true
        await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })

        const message: FetchAccountsApplicationMessageType = { type: 'fetchAccounts' }
        void browser.runtime.sendMessage(message)
      }
    }

    onlinesFiltered.forEach((online) => {
      const user = users.find((value) => value.id === online.id)
      if (!user) return

      browser.notifications.create(`message-${online.login}`, {
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
