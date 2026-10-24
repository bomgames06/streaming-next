import AxiosBase from '@/services/base/axiosBase'
import type { YoutubeOAuthTokenInfoType } from '@/services/api/youtube/types/youtubeApiType'

export default class YoutubeOAuthTokenInfoEndpoint extends AxiosBase {
  constructor() {
    super(import.meta.env.VITE_APP_OAUTH2_YOUTUBE_TOKENINFO_URL)
  }

  // Sent on the body, so the token is not on the url
  async tokenInfo(token: string): Promise<YoutubeOAuthTokenInfoType> {
    const response = await this.axios().post<YoutubeOAuthTokenInfoType>(
      '',
      new URLSearchParams({ access_token: token })
    )
    return response.data
  }
}
