import type { AccountDataStore } from '@/store/system/types/systemStoreType'
import { compact } from 'lodash'
import browser from 'webextension-polyfill'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'

browser.action.setBadgeTextColor({ color: '#FFFFFF' })

export default async function countHandler(accounts: AccountDataStore, count: number) {
  const accountList = compact(Object.values(accounts))
  const invalid = accountList.some((value) => value.invalid)

  if (invalid) return void (await setInvalidBadge())
  await setCountBadge(count)
}

async function setInvalidBadge() {
  await browser.action.setBadgeText({ text: '!' })
  await browser.action.setBadgeBackgroundColor({ color: 'red' })
}

async function setCountBadge(count: number) {
  await browser.action.setBadgeBackgroundColor({ color: '#660099' })
  if (count > 99) await browser.action.setBadgeText({ text: '99+' })
  else if (count > 0) await browser.action.setBadgeText({ text: count.toString() })
  else await browser.action.setBadgeText({ text: null })
}

browser.runtime.onMessage.addListener((message: BackgroundMessageType) => {
  switch (message.type) {
    case 'invalidateBadge':
      return setInvalidBadge()
    case 'setCountBadge':
      return setCountBadge(message.count)
    default:
      break
  }
})
