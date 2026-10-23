import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import type { AccountDataStore, AccountStore } from '@/store/system/types/systemStoreType'
import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import countHandler, { registerCountHandler } from '@/background/handlers/countHandler'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import notificationHandler, {
  registerNotificationHandler,
  type YoutubeNotificationData,
} from '@/background/handlers/notificationHandler'
import TwitchBusiness from '@/services/business/twitchBusiness'
import YoutubeBusiness, { YOUTUBE_TOKEN_LIFETIME } from '@/services/business/youtubeBusiness'
import { auth } from '@/background/authBackground'
import { HttpStatusCode, isAxiosError } from 'axios'

const FETCH_STREAM_ALARM = 'fetchStream'
const FETCH_STREAM_PERIOD_IN_MINUTES = 0.5

let isFetching = false

/**
 * Online YouTube lives, or undefined when they could not be fetched. The account is invalidated when its token is
 * rejected or can't be renewed. Any error (like the quota exceeded) only skips YouTube, never the Twitch streams.
 */
async function fetchYoutube(
  account: AccountStore
): Promise<(YoutubeNotificationData & { onlines: StreamItemLiveOnlineType[] }) | undefined> {
  try {
    if (account.expiresAt !== undefined && account.expiresAt <= Date.now()) {
      try {
        account.token = await auth({ type: 'auth', authType: 'youtube', interactive: false })
        account.expiresAt = Date.now() + YOUTUBE_TOKEN_LIFETIME
      } catch {
        account.invalid = true
        return undefined
      }
    }

    // Both are cached, so most alarms cost no quota
    const streams = await YoutubeBusiness.getStreamersFollowed(account.token, account.accountId)
    const lives = await YoutubeBusiness.getLivesFollowed(
      account.token,
      account.accountId,
      streams.map((value) => value.id)
    )
    if (lives.missingPermission) return undefined

    return { onlines: lives.onlines, upcomings: lives.upcomings, streams }
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized) account.invalid = true
    return undefined
  }
}

async function fetchStreams(alarm?: Browser.alarms.Alarm): Promise<void> {
  if (alarm && alarm.name !== FETCH_STREAM_ALARM) return
  if (isFetching) return

  isFetching = true

  let accounts: AccountDataStore = {}

  const onlines: StreamItemLiveOnlineType[] = []
  try {
    const syncStorage = await browser.storage.sync.get([STORAGE_KEY_ACCOUNTS])

    accounts = (syncStorage[STORAGE_KEY_ACCOUNTS] as AccountDataStore | undefined) ?? {}

    let youtube: Awaited<ReturnType<typeof fetchYoutube>>
    if (accounts.youtube && !accounts.youtube.invalid) {
      const before = JSON.stringify(accounts.youtube)
      youtube = await fetchYoutube(accounts.youtube)
      // Renewed token or invalidated account
      if (JSON.stringify(accounts.youtube) !== before)
        await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
    }

    if (accounts.twitch && !accounts.twitch.invalid)
      onlines.push(
        ...(await TwitchBusiness.getStreamersOnlineFollowed(accounts.twitch.token, accounts.twitch.accountId, true))
      )
    if (youtube) onlines.push(...youtube.onlines)

    await countHandler(accounts, onlines.length)
    if (youtube) await notificationHandler(onlines, { streams: youtube.streams, upcomings: youtube.upcomings })
    else await notificationHandler(onlines)
  } catch (e) {
    if (accounts.twitch && isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized) {
      accounts.twitch.invalid = true
      await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
      await countHandler(accounts, onlines.length)
    }
  } finally {
    isFetching = false
  }
}

async function ensureAlarm(): Promise<void> {
  // Recreating the alarm on every service worker wake-up would reset its schedule
  const alarm = await browser.alarms.get(FETCH_STREAM_ALARM)
  if (!alarm) await browser.alarms.create(FETCH_STREAM_ALARM, { periodInMinutes: FETCH_STREAM_PERIOD_IN_MINUTES })
}

export default function registerFetchStreamBackground() {
  registerCountHandler()
  registerNotificationHandler()

  void ensureAlarm()
  void fetchStreams()

  browser.alarms.onAlarm.addListener(fetchStreams)

  browser.runtime.onMessage.addListener((messageValue: unknown) => {
    const message = messageValue as BackgroundMessageType
    switch (message.type) {
      case 'fetchStream':
        return fetchStreams()
      default:
        break
    }
  })
}
