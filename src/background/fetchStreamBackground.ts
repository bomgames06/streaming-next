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
import YoutubeBusiness from '@/services/business/youtubeBusiness'
import AppBusiness from '@/services/business/appBusiness'
import { HttpStatusCode, isAxiosError } from 'axios'

const FETCH_STREAM_ALARM = 'fetchStream'
const FETCH_STREAM_PERIOD_IN_MINUTES = 0.5

// Twitch requires the apps to validate the user tokens on start and every hour
const TWITCH_VALIDATE_INTERVAL = 60 * 60 * 1000

let isFetching = false
// In memory, so the service worker also validates when it starts
let twitchValidatedAt = 0

function isUnauthorized(e: unknown): boolean {
  return isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized
}
/** A rejected token is renewed on the next fetch when there is a refresh token, the account is invalid otherwise */
function rejectToken(account: AccountStore) {
  if (account.refreshToken) account.expiresAt = 0
  else account.invalid = true
}

/**
 * Renews the expired token with the refresh token (and validates the Twitch one every hour). False when the account
 * can't be used on this fetch, it is invalid when the refresh token is rejected or missing (accounts logged before it).
 */
async function ensureToken(account: AccountStore): Promise<boolean> {
  try {
    if (account.type === 'twitch' && Date.now() - twitchValidatedAt >= TWITCH_VALIDATE_INTERVAL) {
      const valid = await TwitchBusiness.validateToken(account.token)
      twitchValidatedAt = Date.now()
      if (!valid) rejectToken(account)
      if (account.invalid) return false
    }
    if (account.expiresAt !== undefined && account.expiresAt <= Date.now()) {
      if (!account.refreshToken) {
        account.invalid = true
        return false
      }
      // Also the new refresh token, when the provider rotates it
      Object.assign(account, await AppBusiness.renewToken(account))
    }
    return true
  } catch (e) {
    console.warn(`Failed to renew the ${account.type} token`, e)
    if (isUnauthorized(e)) account.invalid = true
    return false
  }
}

/**
 * Online YouTube lives, or undefined when they could not be fetched. Any error (like the quota exceeded) only skips
 * YouTube, never the Twitch streams.
 */
async function fetchYoutube(
  account: AccountStore
): Promise<(YoutubeNotificationData & { onlines: StreamItemLiveOnlineType[] }) | undefined> {
  try {
    // Both are cached, so most alarms cost no quota
    const streams = await YoutubeBusiness.getStreamersFollowed(account.token, account.accountId)
    const lives = await YoutubeBusiness.getLivesFollowed(
      account.token,
      account.accountId,
      streams.map((value) => value.id)
    )
    if (lives.missingPermission) return undefined

    return { onlines: lives.onlines, streams }
  } catch (e) {
    if (isUnauthorized(e)) rejectToken(account)
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
    const before = JSON.stringify(accounts)

    const twitch =
      accounts.twitch && !accounts.twitch.invalid && (await ensureToken(accounts.twitch)) ? accounts.twitch : undefined
    let youtube: Awaited<ReturnType<typeof fetchYoutube>>
    if (accounts.youtube && !accounts.youtube.invalid && (await ensureToken(accounts.youtube)))
      youtube = await fetchYoutube(accounts.youtube)

    // Renewed tokens or invalidated accounts, saved before the handlers read them
    if (JSON.stringify(accounts) !== before) await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
    // Without its streams the notifications would take the Twitch lives as ended, it waits the next fetch
    if (accounts.twitch && !accounts.twitch.invalid && !twitch) return

    if (twitch) onlines.push(...(await TwitchBusiness.getStreamersOnlineFollowed(twitch.token, twitch.accountId, true)))
    if (youtube) onlines.push(...youtube.onlines)

    await countHandler(accounts, onlines.length)
    if (youtube) await notificationHandler(onlines, { streams: youtube.streams })
    else await notificationHandler(onlines)
  } catch (e) {
    if (accounts.twitch && isUnauthorized(e)) {
      rejectToken(accounts.twitch)
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
