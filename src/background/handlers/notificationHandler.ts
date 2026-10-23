import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemLiveUpcomingType,
} from '@/components/listStream/types/streamItemType'
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
import { generateState, isSameCategoryName, twitchUrl, youtubeVideoUrl } from '@/utils/util'
import countHandler from '@/background/handlers/countHandler'
import { uniq, uniqBy } from 'lodash'

export type OnlineHistory = {
  [key in AccountStoreType]?: { id: string; category: string }[]
} & {
  // Video ids of the scheduled YouTube lives already seen
  youtubeUpcoming?: string[]
}
export type YoutubeNotificationData = {
  // Followed channels, for the notification icons
  streams: StreamItemLiveStreamType[]
  upcomings: StreamItemLiveUpcomingType[]
}

// A channel live hides its upcoming lives, they must not notify again when it ends, so the history keeps old ids
const UPCOMING_HISTORY_LIMIT = 500
// The type only has letters, so ids with dashes (like the YouTube video ids) are kept whole
const NOTIFICATION_ID_REGEX = /^([a-zA-Z0-9]{10})-N-([a-z]+)-(.+)$/
const FALLBACK_ICON_URL = '/icons/128.png'

/**
 * @param onlines online streams of every fetched account
 * @param youtube only when YouTube was fetched (its history is kept otherwise)
 */
export default async function notificationHandler(
  onlines: StreamItemLiveOnlineType[],
  youtube?: YoutubeNotificationData
) {
  const youtubeStreams = youtube?.streams
  const syncStorage = (await browser.storage.sync.get([
    STORAGE_KEY_NOTIFICATION_TYPE,
    STORAGE_KEY_NOTIFICATIONS,
    STORAGE_KEY_ACCOUNTS,
    STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  ])) as Partial<StorageSyncTypes>

  const accounts: AccountDataStore = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
  const hasTwitch = !!accounts.twitch && !accounts.twitch.invalid
  const hasYoutube = !!youtubeStreams && !!accounts.youtube && !accounts.youtube.invalid
  if (!hasTwitch && !hasYoutube) return

  const sessionStorage = (await browser.storage.session.get([
    STORAGE_KEY_ONLINE_HISTORY,
    STORAGE_KEY_STARTED,
  ])) as Partial<StorageSessionTypes>

  const onlineHistory: OnlineHistory = sessionStorage[STORAGE_KEY_ONLINE_HISTORY] ?? {}
  const notificationType: NotificationTypeStore =
    syncStorage[STORAGE_KEY_NOTIFICATION_TYPE] ?? DEFAULT_NOTIFICATION_TYPE
  const notifications: NotificationStore[] = syncStorage[STORAGE_KEY_NOTIFICATIONS] ?? []
  const categoryNotifications: CategoryNotificationStore[] = syncStorage[STORAGE_KEY_CATEGORY_NOTIFICATIONS] ?? []
  const started: boolean = sessionStorage[STORAGE_KEY_STARTED] ?? false

  if (started && notificationType !== 'none') {
    const onlinesFiltered = uniqBy(
      onlines.filter(
        (online) =>
          // A YouTube account added after the session start has no history yet, its first fetch is only recorded
          (online.type === 'twitch' || !!onlineHistory[online.type]) &&
          (checkOnlineNotification(notificationType, notifications, online, onlineHistory) ||
            checkCategoryNotification(categoryNotifications, online, onlineHistory))
      ),
      (item) => `${item.type}:${item.id}`
    )

    const twitchOnlines = onlinesFiltered.filter((value) => value.type === 'twitch')
    let users: User[] = []
    if (hasTwitch && twitchOnlines.length) {
      try {
        users = await TwitchBusiness.getUsersByIds(
          accounts.twitch!.token,
          twitchOnlines.map((value) => value.id)
        )
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized) {
          accounts.twitch!.invalid = true
          await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
          await countHandler(accounts, onlines.length)

          const message: FetchAccountsApplicationMessageType = { type: 'fetchAccounts' }
          // The popup may be closed, so there may be no receiver for this message
          browser.runtime.sendMessage(message).catch(() => undefined)
        }
        return
      }
    }

    for (const online of onlinesFiltered) {
      let iconUrl: string | undefined
      let target: string
      if (online.type === 'twitch') {
        const user = users.find((value) => value.id === online.id)
        if (!user) continue
        iconUrl = user.avatarUrl
        target = online.login
      } else {
        // A YouTube live is a video, the notification opens it
        if (!online.videoId) continue
        iconUrl = youtubeStreams?.find((value) => value.id === online.id)?.profileImage
        target = online.videoId
      }

      void browser.notifications.create(`${generateState(10)}-N-${online.type}-${target}`, {
        type: 'basic',
        iconUrl: iconUrl || browser.runtime.getURL(FALLBACK_ICON_URL),
        title: online.name,
        message: online.title || '',
        contextMessage: online.game || undefined,
      })
    }

    // New scheduled lives, the history only exists after the first YouTube fetch
    if (hasYoutube && onlineHistory.youtubeUpcoming) {
      const upcomingHistory = onlineHistory.youtubeUpcoming
      const upcomings = youtube!.upcomings.filter(
        (upcoming) =>
          !upcomingHistory.includes(upcoming.videoId) &&
          (notificationType === 'all' ||
            notifications.some((value) => value.type === upcoming.type && value.id === upcoming.id))
      )
      for (const upcoming of upcomings) {
        void browser.notifications.create(`${generateState(10)}-N-youtube-${upcoming.videoId}`, {
          type: 'basic',
          iconUrl:
            youtubeStreams?.find((value) => value.id === upcoming.id)?.profileImage ||
            browser.runtime.getURL(FALLBACK_ICON_URL),
          title: upcoming.name,
          message: upcoming.title || '',
          contextMessage: `${browser.i18n.getMessage('upcomingNotification')} · ${upcoming.scheduledAt.toDate().toLocaleString()}`,
        })
      }
    }
  }

  // Only the fetched accounts update their history, the others keep it until they are fetched again
  if (hasTwitch) onlineHistory.twitch = historyOf(onlines, 'twitch')
  if (hasYoutube) {
    onlineHistory.youtube = historyOf(onlines, 'youtube')
    onlineHistory.youtubeUpcoming = uniq([
      ...youtube!.upcomings.map((value) => value.videoId),
      ...(onlineHistory.youtubeUpcoming ?? []),
    ]).slice(0, UPCOMING_HISTORY_LIMIT)
  }
  await browser.storage.session.set({ [STORAGE_KEY_ONLINE_HISTORY]: onlineHistory, [STORAGE_KEY_STARTED]: true })
}

function historyOf(onlines: StreamItemLiveOnlineType[], type: AccountStoreType) {
  return onlines.filter((value) => value.type === type).map((value) => ({ id: value.id, category: value.game || '' }))
}

export function registerNotificationHandler() {
  browser.notifications.onClicked.addListener((notificationId) => {
    const match = notificationId.match(NOTIFICATION_ID_REGEX)
    if (match && match[3]) {
      const type = match[2] as AccountStoreType
      if (type === 'twitch') void browser.tabs.create({ url: twitchUrl(match[3]) })
      else if (type === 'youtube') void browser.tabs.create({ url: youtubeVideoUrl(match[3]) })
    }
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
    !(onlineHistory[online.type] ?? []).some(
      (value) => value.id === online.id && isSameCategoryName(value.category, online.game)
    )
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
    !(onlineHistory[online.type] ?? []).some((value) => value.id === online.id)
  )
}
