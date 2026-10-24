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

export function youtubeOAuthWebAuth(
  state: string,
  forceVerify?: boolean,
  interactive?: boolean,
  loginHint?: string
): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_APP_OAUTH2_YOUTUBE_CLIENTID ?? '',
    redirect_uri: browser.identity.getRedirectURL(),
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    include_granted_scopes: 'true',
    state,
  })
  // The silent renew must not show any page, otherwise the user picks the Google account (and so the channel)
  if (interactive === false) params.set('prompt', 'none')
  else params.set('prompt', forceVerify ? 'select_account consent' : 'select_account')
  // Without it Google can't choose between the logged accounts and the silent renew fails
  if (loginHint) params.set('login_hint', loginHint)

  return `${import.meta.env.VITE_APP_OAUTH2_YOUTUBE_URL}/auth?${params.toString()}`
}
export function youtubeOAuthRevoke(token: string): { url: string; body: URLSearchParams } {
  return {
    url: import.meta.env.VITE_APP_OAUTH2_YOUTUBE_REVOKE_URL,
    body: new URLSearchParams({ token }),
  }
}
export function isYoutubeEnabled(): boolean {
  return !!import.meta.env.VITE_APP_OAUTH2_YOUTUBE_CLIENTID
}

export function generateState(size?: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  // Used as the OAuth state, so it must come from a cryptographically secure source
  const randomValues = crypto.getRandomValues(new Uint32Array(size || 50))
  return Array.from(randomValues, (value) => chars.charAt(value % chars.length)).join('')
}

export function accountTypeColor(accountType: AccountStoreType, bg?: boolean, text?: boolean): string {
  if (accountType === 'twitch') return `${bg ? 'bg-' : text ? 'text-' : ''}twitch`
  else if (accountType === 'youtube') return `${bg ? 'bg-' : text ? 'text-' : ''}youtube`
  else throw new Error('accountType is undefined')
}

export function twitchUrl(name: string): string {
  return `https://twitch.tv/${name}`
}
export function youtubeChannelUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}`
}
export function youtubeVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
export function accountProfileUrl(account: AccountStore): string {
  if (account.type === 'twitch') return twitchUrl(account.login)
  else if (account.type === 'youtube') return youtubeChannelUrl(account.accountId)
  else throw new Error('accountType is undefined')
}
export function streamItemProfileUrl(item: StreamItemType): string {
  if (item.type === 'twitch') return twitchUrl(item.login)
  else if (item.type === 'youtube') {
    // Live and upcoming items open the video itself, the channel page would only show it after some clicks
    if ((item.status === 'online' || item.status === 'upcoming') && item.videoId) return youtubeVideoUrl(item.videoId)
    return youtubeChannelUrl(item.id)
  } else throw new Error('accountType is undefined')
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

// Like Promise.all over a map, but with at most `concurrency` handlers running at the same time
export async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await handler(items[index])
    }
  })
  await Promise.all(workers)

  return results
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => void setTimeout(resolve, ms))
}
