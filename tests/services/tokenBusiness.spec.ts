import { describe, expect, it } from 'vitest'
import TokenBusiness from '@/services/business/tokenBusiness'
import { YOUTUBE_BACK_URL, youtubeServer } from '@tests/__utils__/youtubeServer'
import { twitchServer } from '@tests/__utils__/twitchServer'

describe('TokenBusiness', () => {
  it('Exchange the YouTube code on streaming-next-back', async () => {
    const { http } = youtubeServer()

    const before = Date.now()
    const result = await TokenBusiness.exchangeCode('youtube', {
      code: 'code',
      codeVerifier: 'verifier',
      redirectUri: 'https://ext.chromiumapp.org/',
    })

    expect(http.requests.at(-1)!.url).toBe(`${YOUTUBE_BACK_URL}/token`)
    expect(http.requests.at(-1)!.body).toStrictEqual({
      code: 'code',
      codeVerifier: 'verifier',
      redirectUri: 'https://ext.chromiumapp.org/',
    })
    expect(result.token).toBe('access-token')
    expect(result.refreshToken).toBe('refresh-token')
    // Renewed 5 minutes before the token expires
    expect(result.expiresAt - before).toBeGreaterThanOrEqual(3599 * 1000 - 5 * 60 * 1000)
    expect(result.expiresAt - Date.now()).toBeLessThanOrEqual(3599 * 1000 - 5 * 60 * 1000)
  })
  it('Reject a login without the refresh token', async () => {
    const { http } = youtubeServer()
    http.on('post', `${YOUTUBE_BACK_URL}/token`, { data: { accessToken: 'access-token', expiresIn: 3599 } })

    await expect(
      TokenBusiness.exchangeCode('youtube', { code: 'code', codeVerifier: 'verifier', redirectUri: 'https://ext/' })
    ).rejects.toThrow('Refresh token not found')
  })
  it('Renew the YouTube token, it keeps its refresh token', async () => {
    const { data, refreshRequests } = youtubeServer()

    const result = await TokenBusiness.renewToken('youtube', 'refresh-token')
    expect(result).toStrictEqual({ token: 'renewed-token', expiresAt: expect.any(Number) })
    expect(result.expiresAt).toBeGreaterThan(Date.now() + 50 * 60 * 1000)
    expect(refreshRequests()[0].body).toStrictEqual({ refreshToken: 'refresh-token' })

    data.refreshRejected = true
    await expect(TokenBusiness.renewToken('youtube', 'refresh-token')).rejects.toMatchObject({
      response: { status: 401 },
    })
  })
  it('Renew the Twitch token with the rotated refresh token', async () => {
    const { http } = twitchServer()

    expect(await TokenBusiness.renewToken('twitch', 'twitch-refresh-token')).toStrictEqual({
      token: 'renewed-twitch-token',
      expiresAt: expect.any(Number),
      refreshToken: 'rotated-refresh-token',
    })
    expect(http.requests.at(-1)!.body).toStrictEqual({ refreshToken: 'twitch-refresh-token' })
  })
})
