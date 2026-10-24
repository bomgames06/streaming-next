import { browser } from 'wxt/browser'
import type {
  AuthBackgroundMessageType,
  BackgroundMessageType,
  RevokeBackgroundMessageType,
} from '@/background/types/backgroundMessageType'
import {
  generateState,
  pkceChallenge,
  twitchOAuthRevoke,
  twitchOAuthWebAuth,
  youtubeOAuthRevoke,
  youtubeOAuthWebAuth,
} from '@/utils/util'
import TokenBusiness from '@/services/business/tokenBusiness'
import type { AccountTokenType } from '@/types/userType'

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

/**
 * Code flow, streaming-next-back exchanges the code for the tokens (with the refresh one). The flow runs here, the popup
 * may close (Firefox closes it when the auth window takes the focus).
 */
export async function auth(message: AuthBackgroundMessageType): Promise<AccountTokenType> {
  const redirectUri = browser.identity.getRedirectURL()
  if (message.authType === 'twitch') {
    const params = await launchAuthFlow((state) => twitchOAuthWebAuth(state, message.forceVerify), message.interactive)
    return TokenBusiness.exchangeCode('twitch', { code: codeOf(params), redirectUri })
  } else if (message.authType === 'youtube') {
    const codeVerifier = generateState(64)
    const challenge = await pkceChallenge(codeVerifier)
    const params = await launchAuthFlow((state) => youtubeOAuthWebAuth(state, challenge), message.interactive)
    return TokenBusiness.exchangeCode('youtube', { code: codeOf(params), codeVerifier, redirectUri })
  }
  throw new Error('Type is undefined')
}

function codeOf(params: URLSearchParams): string {
  const code = params.get('code')
  if (!code) throw new Error('Code not found')
  return code
}

/** Parameters of the redirect, after checking the state and the OAuth error */
async function launchAuthFlow(authUrl: (state: string) => string, interactiveOption?: boolean) {
  const state = generateState()
  const interactive = interactiveOption ?? true

  const details: Parameters<typeof browser.identity.launchWebAuthFlow>[0] = { url: authUrl(state), interactive }
  // Chromium aborts a non interactive flow on the first page load, but Google redirects through some pages first.
  // Firefox rejects unknown properties, so they are only set on Chromium
  if (!interactive && !navigator.userAgent.includes('Firefox'))
    Object.assign(details, { abortOnLoadForNonInteractive: false, timeoutMsForNonInteractive: 10000 })

  const response = await browser.identity.launchWebAuthFlow(details)
  if (!response) throw new Error('Auth flow without response')

  const urlObj = new URL(response.replace('#', '?'))
  if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect')
  // Like access_denied, when the user cancels
  const error = urlObj.searchParams.get('error')
  if (error) throw new Error(error)

  return urlObj.searchParams
}

async function revoke(message: RevokeBackgroundMessageType): Promise<boolean> {
  let request: { url: string; body: URLSearchParams }
  if (message.authType === 'twitch') request = twitchOAuthRevoke(message.token)
  else if (message.authType === 'youtube') request = youtubeOAuthRevoke(message.token)
  else throw new Error('Type is undefined')

  await fetch(request.url, { method: 'POST', body: request.body })
  return true
}
