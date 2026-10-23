import YoutubeApiBase from '@/services/api/youtube/base/youtubeApiBase'
import type { YoutubeApiBaseListType, YoutubeApiChannelType } from '@/services/api/youtube/types/youtubeApiType'

export default class YoutubeApiChannelEndpoint extends YoutubeApiBase {
  constructor() {
    super('/channels')
  }

  async self(token: string): Promise<YoutubeApiChannelType | undefined> {
    const response = await this.axios().get<YoutubeApiBaseListType<YoutubeApiChannelType>>('', {
      headers: this.headers(token),
      params: {
        part: 'snippet',
        mine: true,
      },
    })

    // Google accounts without a channel have no items
    return response.data.items?.[0]
  }
}
