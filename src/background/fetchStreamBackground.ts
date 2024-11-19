import browser, { Alarms } from 'webextension-polyfill'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import type { AccountDataStore } from '@/store/system/types/systemStoreType'
import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import Alarm = Alarms.Alarm
import countHandler from '@/background/handlers/countHandler'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import notificationHandler from '@/background/handlers/notificationHandler'
import TwitchBusiness from '@/services/business/twitchBusiness'
import { HttpStatusCode, isAxiosError } from 'axios'

let isFetching = false

browser.alarms.create('fetchStream', { periodInMinutes: 0.5 })

async function fetchStreams(alarm?: Alarm): Promise<void> {
  if (alarm && alarm.name !== 'fetchStream') return
  if (isFetching) return

  isFetching = true

  let syncStorage: Record<string, unknown>
  let accounts: AccountDataStore = {}

  const onlines: StreamItemLiveOnlineType[] = []
  try {
    syncStorage = await browser.storage.sync.get([STORAGE_KEY_ACCOUNTS])

    accounts = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}

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
