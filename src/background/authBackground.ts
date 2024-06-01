import browser from 'webextension-polyfill'
import type {
  AuthBackgroundMessageType,
  BackgroundMessageType,
  RevokeBackgroundMessageType,
} from '@/background/types/backgroundMessageType'
import { generateState, twitchOAuthRevoke, twitchOAuthWebAuth } from '@/utils/util'

browser.runtime.onMessage.addListener(async (message: BackgroundMessageType) => {
  switch (message.type) {
    case 'auth':
      return auth(message)
    case 'revoke':
      return revoke(message)
    default:
      break
  }
  return true
})

async function auth(message: AuthBackgroundMessageType) {
  if (message.authType === 'twitch') {
    const state = generateState()
    const twitchUrl = twitchOAuthWebAuth(state, message.forceVerify)

    const response = await browser.identity.launchWebAuthFlow({
      url: twitchUrl,
      interactive: true,
    })

    const urlObj = new URL(response.replace('#', '?'))
    if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect')

    const accessToken = urlObj.searchParams.get('access_token')
    if (!accessToken) throw new Error('Token not found')

    return accessToken
  }
}

async function revoke(message: RevokeBackgroundMessageType): Promise<boolean> {
  if (message.authType === 'twitch') {
    const twitchRevokeUrl = twitchOAuthRevoke(message.token)
    await fetch(twitchRevokeUrl, { method: 'POST' })
  }
  return true
}
