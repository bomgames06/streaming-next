import BackApi from '@/services/api/back/backApi'
import type { BackTokenType } from '@/services/api/back/types/backApiType'
import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import type { AccountTokenType } from '@/types/userType'

// Renewed a bit before they expire (YouTube tokens last 1 hour, Twitch ones about 4 hours)
const TOKEN_RENEW_MARGIN = 5 * 60 * 1000

function accountToken(response: BackTokenType): AccountTokenType {
  return {
    token: response.accessToken,
    expiresAt: Date.now() + response.expiresIn * 1000 - TOKEN_RENEW_MARGIN,
    ...(response.refreshToken && { refreshToken: response.refreshToken }),
  }
}

/** Login codes and refresh tokens, through streaming-next-back */
const TokenBusiness = {
  async exchangeCode(
    type: AccountStoreType,
    body: { code: string; redirectUri: string; codeVerifier?: string }
  ): Promise<AccountTokenType> {
    const token = accountToken(await BackApi.tokens[type].exchange(body))
    if (!token.refreshToken) throw new Error('Refresh token not found')
    return token
  },
  /**
   * New access token without the user, rejected with 401 when the refresh token is no longer valid. It has the new
   * refresh token when the provider rotates it.
   */
  async renewToken(type: AccountStoreType, refreshToken: string): Promise<AccountTokenType> {
    return accountToken(await BackApi.tokens[type].refresh(refreshToken))
  },
}

export default TokenBusiness
