import { browser } from 'wxt/browser'
import type {
  AuthBackgroundMessageType,
  BackgroundMessageType,
  RevokeBackgroundMessageType,
} from '@/background/types/backgroundMessageType'
import {
  generateState,
  twitchOAuthRevoke,
  twitchOAuthWebAuth,
  youtubeOAuthRevoke,
  youtubeOAuthWebAuth,
} from '@/utils/util'

export default function registerAuthBackground() {
  browser.runtime.onMessage.addListener((messageValue: unknown) => {
    const message = messageValue as BackgroundMessageType
    switch (message.type) {
      case 'auth':
        return auth(message)
      case 'revoke':
        return revoke(message)
      default:
        break
    }
  })
}

// Exported for the background itself, a runtime message never reaches the listeners of its own context
export async function auth(message: AuthBackgroundMessageType) {
  const state = generateState()
  const interactive = message.interactive ?? true

  let authUrl: string
  if (message.authType === 'twitch') authUrl = twitchOAuthWebAuth(state, message.forceVerify)
  else if (message.authType === 'youtube') authUrl = youtubeOAuthWebAuth(state, message.forceVerify, interactive)
  else throw new Error('Type is undefined')

  const details: Parameters<typeof browser.identity.launchWebAuthFlow>[0] = { url: authUrl, interactive }
  // Chromium aborts a non interactive flow on the first page load, but Google redirects through some pages first.
  // Firefox rejects unknown properties, so they are only set on Chromium
  if (!interactive && !navigator.userAgent.includes('Firefox'))
    Object.assign(details, { abortOnLoadForNonInteractive: false, timeoutMsForNonInteractive: 10000 })

  const response = await browser.identity.launchWebAuthFlow(details)
  if (!response) throw new Error('Auth flow without response')

  const urlObj = new URL(response.replace('#', '?'))
  if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect')

  const accessToken = urlObj.searchParams.get('access_token')
  if (!accessToken) throw new Error('Token not found')

  return accessToken
}

async function revoke(message: RevokeBackgroundMessageType): Promise<boolean> {
  let request: { url: string; body: URLSearchParams }
  if (message.authType === 'twitch') request = twitchOAuthRevoke(message.token)
  else if (message.authType === 'youtube') request = youtubeOAuthRevoke(message.token)
  else throw new Error('Type is undefined')

  await fetch(request.url, { method: 'POST', body: request.body })
  return true
}
