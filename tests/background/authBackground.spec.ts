import { describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import registerAuthBackground from '@/background/authBackground'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'

function launchWebAuthFlowWith(response: (url: string) => string | undefined) {
  vi.spyOn(browser.identity, 'getRedirectURL').mockReturnValue('https://ext.chromiumapp.org/')
  return vi.spyOn(browser.identity, 'launchWebAuthFlow').mockImplementation(async ({ url }) => response(url) as string)
}
async function send(message: unknown) {
  const [result] = await fakeBrowser.runtime.onMessage.trigger(message, {}, () => undefined)
  return result
}

describe('authBackground', () => {
  it('Return the token of the OAuth flow', async () => {
    registerAuthBackground()
    const launchSpy = launchWebAuthFlowWith((url) => {
      const state = new URL(url).searchParams.get('state')
      return `https://ext.chromiumapp.org/#access_token=the-token&state=${state}`
    })

    const message: BackgroundMessageType = { type: 'auth', authType: 'twitch', forceVerify: true }
    expect(await send(message)).toBe('the-token')
    expect(launchSpy.mock.lastCall![0].interactive).toBe(true)
    expect(new URL(launchSpy.mock.lastCall![0].url).searchParams.get('force_verify')).toBe('true')

    await send({ type: 'auth', authType: 'twitch', interactive: false })
    expect(launchSpy.mock.lastCall![0].interactive).toBe(false)
  })
  it('Reject invalid OAuth responses', async () => {
    registerAuthBackground()

    launchWebAuthFlowWith(() => undefined)
    await expect(send({ type: 'auth', authType: 'twitch' })).rejects.toThrow('Auth flow without response')

    launchWebAuthFlowWith(() => 'https://ext.chromiumapp.org/#access_token=t&state=wrong')
    await expect(send({ type: 'auth', authType: 'twitch' })).rejects.toThrow('State incorrect')

    launchWebAuthFlowWith((url) => `https://ext.chromiumapp.org/#state=${new URL(url).searchParams.get('state')}`)
    await expect(send({ type: 'auth', authType: 'twitch' })).rejects.toThrow('Token not found')

    await expect(send({ type: 'auth', authType: 'unknown' })).rejects.toThrow('Type is undefined')
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
