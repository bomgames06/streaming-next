import { describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import registerAuthBackground from '@/background/authBackground'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import type { AccountTokenType } from '@/types/userType'
import { twitchServer } from '@tests/__utils__/twitchServer'
import { pkceChallenge } from '@/utils/util'
import { youtubeServer } from '@tests/__utils__/youtubeServer'

function launchWebAuthFlowWith(response: (url: string) => string | undefined) {
  vi.spyOn(browser.identity, 'getRedirectURL').mockReturnValue('https://ext.chromiumapp.org/')
  return vi.spyOn(browser.identity, 'launchWebAuthFlow').mockImplementation(async ({ url }) => response(url) as string)
}
async function send(message: unknown) {
  const [result] = await fakeBrowser.runtime.onMessage.trigger(message, {}, () => undefined)
  return result
}

describe('authBackground', () => {
  it('Log in Twitch with the code, exchanged on streaming-next-back', async () => {
    registerAuthBackground()
    const { http } = twitchServer()
    const launchSpy = launchWebAuthFlowWith((url) => {
      const state = new URL(url).searchParams.get('state')
      return `https://ext.chromiumapp.org/?code=the-code&state=${state}`
    })

    const message: BackgroundMessageType = { type: 'auth', authType: 'twitch', forceVerify: true }
    const result = (await send(message)) as AccountTokenType

    expect(result).toMatchObject({ token: 'fresh-token', refreshToken: 'twitch-refresh-token' })
    expect(result.expiresAt).toBeGreaterThan(Date.now() + 3 * 60 * 60 * 1000)
    expect(launchSpy.mock.lastCall![0].interactive).toBe(true)
    const params = new URL(launchSpy.mock.lastCall![0].url).searchParams
    expect(params.get('response_type')).toBe('code')
    expect(params.get('force_verify')).toBe('true')
    expect(http.requests.at(-1)!.body).toStrictEqual({ code: 'the-code', redirectUri: 'https://ext.chromiumapp.org/' })
  })
  it('Reject invalid OAuth responses', async () => {
    registerAuthBackground()

    launchWebAuthFlowWith(() => undefined)
    await expect(send({ type: 'auth', authType: 'twitch' })).rejects.toThrow('Auth flow without response')

    launchWebAuthFlowWith(() => 'https://ext.chromiumapp.org/?code=c&state=wrong')
    await expect(send({ type: 'auth', authType: 'twitch' })).rejects.toThrow('State incorrect')

    launchWebAuthFlowWith((url) => `https://ext.chromiumapp.org/?state=${new URL(url).searchParams.get('state')}`)
    await expect(send({ type: 'auth', authType: 'twitch' })).rejects.toThrow('Code not found')

    await expect(send({ type: 'auth', authType: 'unknown' })).rejects.toThrow('Type is undefined')
  })
  it('Log in YouTube with the code and PKCE, exchanged on streaming-next-back', async () => {
    registerAuthBackground()
    const { http } = youtubeServer()
    const launchSpy = launchWebAuthFlowWith((url) => {
      const state = new URL(url).searchParams.get('state')
      return `https://ext.chromiumapp.org/?code=the-code&state=${state}`
    })

    const result = (await send({ type: 'auth', authType: 'youtube' })) as AccountTokenType

    expect(result).toMatchObject({ token: 'access-token', refreshToken: 'refresh-token' })
    expect(launchSpy.mock.lastCall![0].interactive).toBe(true)
    const params = new URL(launchSpy.mock.lastCall![0].url).searchParams
    expect(params.get('response_type')).toBe('code')
    expect(params.get('access_type')).toBe('offline')
    // Google only returns the refresh token when the user consents
    expect(params.get('prompt')).toBe('select_account consent')
    expect(params.get('code_challenge_method')).toBe('S256')

    const body = http.requests.at(-1)!.body as { code: string; codeVerifier: string; redirectUri: string }
    expect(body.code).toBe('the-code')
    expect(body.redirectUri).toBe('https://ext.chromiumapp.org/')
    expect(params.get('code_challenge')).toBe(await pkceChallenge(body.codeVerifier))
    expect(body.codeVerifier.length).toBeGreaterThanOrEqual(43)
  })
  it('Reject with the OAuth error, like when the user cancels', async () => {
    registerAuthBackground()
    launchWebAuthFlowWith(
      (url) => `https://ext.chromiumapp.org/?error=access_denied&state=${new URL(url).searchParams.get('state')}`
    )
    await expect(send({ type: 'auth', authType: 'youtube' })).rejects.toThrow('access_denied')

    launchWebAuthFlowWith((url) => `https://ext.chromiumapp.org/?state=${new URL(url).searchParams.get('state')}`)
    await expect(send({ type: 'auth', authType: 'youtube' })).rejects.toThrow('Code not found')
  })
  it('Revoke the token on Twitch', async () => {
    registerAuthBackground()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null))

    expect(await send({ type: 'revoke', authType: 'twitch', token: 'abc' })).toBe(true)
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.lastCall!
    expect(url).toBe(`${import.meta.env.VITE_APP_OAUTH2_TWITCH_URL}/revoke`)
    expect(init?.method).toBe('POST')
    expect(Object.fromEntries(init!.body as URLSearchParams)).toStrictEqual({
      client_id: import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
      token: 'abc',
    })

    await expect(send({ type: 'revoke', authType: 'unknown', token: 'abc' })).rejects.toThrow('Type is undefined')
  })
  it('Ignore other messages', async () => {
    registerAuthBackground()

    expect(await send({ type: 'fetchStream' })).toBeUndefined()
  })
})
