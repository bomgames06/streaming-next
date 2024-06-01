import browser, { Alarms } from 'webextension-polyfill'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import type { AccountDataStore } from '@/store/system/types/systemStoreType'
import AppBusiness from '@/services/business/appBusiness'
import type { StreamItemLiveOnlineType } from '@/components/listStream/types/streamItemType'
import { HttpStatusCode, isAxiosError } from 'axios'
import Alarm = Alarms.Alarm
import countHandler from '@/background/handlers/countHandler'
import type {
  BackgroundMessageType,
  FetchAccountsApplicationMessageType,
} from '@/background/types/backgroundMessageType'
import notificationHandler from '@/background/handlers/notificationHandler'

browser.alarms.create('fetchStream', { periodInMinutes: 0.5 })

async function fetchStreams(alarm?: Alarm): Promise<void> {
  if (alarm && alarm.name !== 'fetchStream') return

  const syncStorage = await browser.storage.sync.get([STORAGE_KEY_ACCOUNTS])

  const accounts: AccountDataStore = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}

  const onlines: StreamItemLiveOnlineType[] = []
  let fetchAccount = false
  try {
    if (accounts.twitch && !accounts.twitch.invalid)
      onlines.push(...(await AppBusiness.getStreamersOnlineFollowed(accounts.twitch)))
  } catch (e) {
    if (accounts.twitch && isAxiosError(e) && e.status === HttpStatusCode.Unauthorized) {
      accounts.twitch.invalid = true
      await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts })
      fetchAccount = true
    }
  }

  if (fetchAccount) {
    const message: FetchAccountsApplicationMessageType = { type: 'fetchAccounts' }
    void browser.runtime.sendMessage(message)
  }

  await countHandler(accounts, onlines.length)
  await notificationHandler(onlines)
}
void fetchStreams()

browser.alarms.onAlarm.addListener(fetchStreams)

browser.runtime.onMessage.addListener(async (message: BackgroundMessageType) => {
  switch (message.type) {
    case 'fetchStream':
      return fetchStreams()
    default:
      break
  }
  return true
})
