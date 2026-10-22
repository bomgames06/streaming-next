import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import type { AccountDataStore } from '@/store/system/types/systemStoreType'
import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import countHandler, { registerCountHandler } from '@/background/handlers/countHandler'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import notificationHandler, { registerNotificationHandler } from '@/background/handlers/notificationHandler'
import TwitchBusiness from '@/services/business/twitchBusiness'
import { HttpStatusCode, isAxiosError } from 'axios'

const FETCH_STREAM_ALARM = 'fetchStream'
const FETCH_STREAM_PERIOD_IN_MINUTES = 0.5

let isFetching = false

async function fetchStreams(alarm?: Browser.alarms.Alarm): Promise<void> {
  if (alarm && alarm.name !== FETCH_STREAM_ALARM) return
  if (isFetching) return

  isFetching = true

  let accounts: AccountDataStore = {}

  const onlines: StreamItemLiveOnlineType[] = []
  try {
    const syncStorage = await browser.storage.sync.get([STORAGE_KEY_ACCOUNTS])

    accounts = (syncStorage[STORAGE_KEY_ACCOUNTS] as AccountDataStore | undefined) ?? {}

    if (accounts.twitch && !accounts.twitch.invalid)
      onlines.push(
        ...(await TwitchBusiness.getStreamersOnlineFollowed(accounts.twitch.token, accounts.twitch.accountId, true))
      )

    await countHandler(accounts, onlines.length)
    await notificationHandler(onlines)
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
