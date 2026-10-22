import { browser } from 'wxt/browser'
import type {
  AuthBackgroundMessageType,
  BackgroundMessageType,
  RevokeBackgroundMessageType,
} from '@/background/types/backgroundMessageType'
import { generateState, twitchOAuthRevoke, twitchOAuthWebAuth } from '@/utils/util'

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

async function auth(message: AuthBackgroundMessageType) {
  if (message.authType === 'twitch') {
    const state = generateState()
    const twitchUrl = twitchOAuthWebAuth(state, message.forceVerify)

    const response = await browser.identity.launchWebAuthFlow({
      url: twitchUrl,
      interactive: message.interactive ?? true,
    })
    if (!response) throw new Error('Auth flow without response')

    const urlObj = new URL(response.replace('#', '?'))
    if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect')

    const accessToken = urlObj.searchParams.get('access_token')
    if (!accessToken) throw new Error('Token not found')

    return accessToken
  } else throw new Error('Type is undefined')
}

async function revoke(message: RevokeBackgroundMessageType): Promise<boolean> {
  if (message.authType === 'twitch') {
    const { url, body } = twitchOAuthRevoke(message.token)
    await fetch(url, { method: 'POST', body })
  } else throw new Error('Type is undefined')
  return true
}
