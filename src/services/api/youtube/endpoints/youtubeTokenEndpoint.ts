import AxiosBase from '@/services/base/axiosBase'
import type { YoutubeTokenType } from '@/services/api/youtube/types/youtubeApiType'

// streaming-next-back, it keeps the Google client secret the token requests need
export default class YoutubeTokenEndpoint extends AxiosBase {
  constructor() {
    super(`${import.meta.env.VITE_APP_API_BACK_URL}/youtube`)
  }

  async exchange(code: string, codeVerifier: string, redirectUri: string): Promise<YoutubeTokenType> {
    const response = await this.axios().post<YoutubeTokenType>(
      '/token',
      JSON.stringify({ code, codeVerifier, redirectUri }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    return response.data
  }

  /** Rejected with 401 when the refresh token was revoked or expired */
  async refresh(refreshToken: string): Promise<YoutubeTokenType> {
    const response = await this.axios().post<YoutubeTokenType>('/refresh', JSON.stringify({ refreshToken }), {
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  }
}
