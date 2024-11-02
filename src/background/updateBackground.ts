import browser from 'webextension-polyfill'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
  STORAGE_KEY_STREAM_ORDER,
  STORAGE_KEY_STREAM_ORDER_SORT,
} from '@/types/syncStorageKeysTypes'
import { v4 as uuidV4 } from 'uuid'
import type { User } from '@/types/userType'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type { AccountDataStore } from '@/store/system/types/systemStoreType'

function isVersionLowerOrEqual(version1: string, version2: string) {
  const v1parts = version1.split('.').map(Number)
  const v2parts = version2.split('.').map(Number)

  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); ++i) {
    if (v1parts[i] === undefined || v1parts[i] < (v2parts[i] || 0)) return true
    if (v2parts[i] === undefined || v1parts[i] > (v2parts[i] || 0)) return false
  }
  return true
}

async function migrateOldSave(details: browser.Runtime.OnInstalledDetailsType) {
  if (!details.previousVersion || !isVersionLowerOrEqual(details.previousVersion, '1.2.5')) return
  const keys = ['accessToken', 'expiredToken', 'filterOrderList', 'filterOrderAsc', 'notification', 'notificationIds']
  const oldSave = (await browser.storage.sync.get(keys)) as {
    accessToken: string
    expiredToken: unknown
    filterOrderList: unknown
    filterOrderAsc: unknown
    notification: unknown
    notificationIds: string[]
  }

  let user: User | undefined
  try {
    if (oldSave.accessToken) user = await TwitchBusiness.getSelfUser(oldSave.accessToken)
  } catch (e) {
    // do nothing
  }

  await browser.storage.sync.set({
    [STORAGE_KEY_ACCOUNTS]: user
      ? ({
          twitch: {
            type: 'twitch',
            id: uuidV4(),
            token: oldSave.accessToken,
            invalid: false,
            accountId: user.id,
            name: user.name,
            login: user.login,
            avatarUrl: user.avatarUrl,
          },
        } as AccountDataStore)
      : {},
    [STORAGE_KEY_STREAM_ORDER]: oldSave.filterOrderList,
    [STORAGE_KEY_STREAM_ORDER_SORT]: oldSave.filterOrderAsc,
    [STORAGE_KEY_NOTIFICATION_TYPE]: oldSave.notification,
    [STORAGE_KEY_NOTIFICATIONS]: (oldSave.notificationIds || []).map((value: string) => ({
      id: value,
      type: 'twitch',
    })),
  })
  await browser.storage.sync.remove(keys)
}

async function upgradeFavorites(details: browser.Runtime.OnInstalledDetailsType) {
  if (!details.previousVersion || !isVersionLowerOrEqual(details.previousVersion, '1.3.1')) return
  const syncStorage = await browser.storage.sync.get([STORAGE_KEY_NOTIFICATIONS])
  await browser.storage.sync.set({ [STORAGE_KEY_FAVORITES]: syncStorage[STORAGE_KEY_NOTIFICATIONS] })
}

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    void migrateOldSave(details)
    void upgradeFavorites(details)
  }
})
