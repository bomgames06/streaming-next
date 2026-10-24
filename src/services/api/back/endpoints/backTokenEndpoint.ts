import AxiosBase from '@/services/base/axiosBase'
import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import type { BackTokenType } from '@/services/api/back/types/backApiType'

// streaming-next-back, it keeps the client secrets the token requests need
export default class BackTokenEndpoint extends AxiosBase {
  constructor(provider: AccountStoreType) {
    super(`${import.meta.env.VITE_APP_API_BACK_URL}/${provider}`)
  }

  /** Code of the login flow, YouTube also sends its PKCE verifier */
  async exchange(body: { code: string; redirectUri: string; codeVerifier?: string }): Promise<BackTokenType> {
    const response = await this.axios().post<BackTokenType>('/token', JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  }

  /** Rejected with 401 when the refresh token was revoked or expired */
  async refresh(refreshToken: string): Promise<BackTokenType> {
    const response = await this.axios().post<BackTokenType>('/refresh', JSON.stringify({ refreshToken }), {
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  }
}
