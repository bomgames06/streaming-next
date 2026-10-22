import { browser } from 'wxt/browser'
import type { AccountStore, AccountStoreType, ClipPeriodStore } from '@/store/system/types/systemStoreType'
import type { StreamItemType } from '@/components/listStream/types/streamItemType'
import { deburr, upperCase } from 'lodash'
import type { Moment } from 'moment'
import moment from 'moment'

export function twitchOAuthWebAuth(state: string, forceVerify?: boolean): string {
  return `${import.meta.env.VITE_APP_OAUTH2_TWITCH_URL}/authorize?client_id=${import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID}&redirect_uri=${encodeURIComponent(browser.identity.getRedirectURL())}&response_type=token&state=${state}&force_verify=${forceVerify ?? false}&scope=user%3Aread%3Afollows%20user%3Aread%3Aemail`
}
export function twitchOAuthRevoke(token: string): { url: string; body: URLSearchParams } {
  return {
    url: `${import.meta.env.VITE_APP_OAUTH2_TWITCH_URL}/revoke`,
    body: new URLSearchParams({ client_id: import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID, token }),
  }
}

export function generateState(size?: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  // Used as the OAuth state, so it must come from a cryptographically secure source
  const randomValues = crypto.getRandomValues(new Uint32Array(size || 50))
  return Array.from(randomValues, (value) => chars.charAt(value % chars.length)).join('')
}

export function accountTypeColor(accountType: AccountStoreType, bg?: boolean, text?: boolean): string {
  if (accountType === 'twitch') return `${bg ? 'bg-' : text ? 'text-' : ''}twitch`
  else throw new Error('accountType is undefined')
}

export function twitchUrl(name: string): string {
  return `https://twitch.tv/${name}`
}
export function accountProfileUrl(account: AccountStore): string {
  if (account.type === 'twitch') return twitchUrl(account.login)
  else throw new Error('accountType is undefined')
}
export function streamItemProfileUrl(item: StreamItemType): string {
  if (item.type === 'twitch') return twitchUrl(item.login)
  else throw new Error('accountType is undefined')
}

export function partition<T>(collection: T[], amount: number): T[][] {
  const value: T[][] = []
  for (let i = 0; i < collection.length; i += amount) {
    value.push(collection.slice(i, i + amount))
  }

  return value
}

export function isSameCategoryName(a?: string, b?: string): boolean {
  return !!a && !!b && upperCase(a) === upperCase(b)
}

export function includeUtil(value?: string, include?: string): boolean {
  return deburr(value).toLowerCase().includes(deburr(include).toLowerCase())
}

export function twitchDurationToSeconds(duration: string): number {
  const match = duration.match(/^((\d+)h)?((\d+)m)?((\d+)s)?$/)
  if (!match) return 0

  const time: string[] = []
  time.push(match[2] || '0')
  time.push(match[4] || '0')
  time.push(match[6] || '0')

  return moment.duration(time.join(':')).asSeconds()
}

export function getTimeByClipPeriod(period?: ClipPeriodStore): Moment | undefined {
  if (period === '24h') return moment().subtract(1, 'days')
  if (period === '7d') return moment().subtract(7, 'days')
  if (period === '30d') return moment().subtract(30, 'days')
  return undefined
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => void setTimeout(resolve, ms))
}
