import YoutubeApiBase from '@/services/api/youtube/base/youtubeApiBase'
import type { YoutubeApiBaseListType, YoutubeApiSubscriptionType } from '@/services/api/youtube/types/youtubeApiType'

export default class YoutubeApiSubscriptionEndpoint extends YoutubeApiBase {
  constructor() {
    super('/subscriptions')
  }

  // Costs 1 quota unit for each page of 50 channels
  async mine(token: string): Promise<YoutubeApiSubscriptionType[]> {
    return this.fetchAll(async (pageToken) => {
      const response = await this.axios().get<YoutubeApiBaseListType<YoutubeApiSubscriptionType>>('', {
        headers: this.headers(token),
        params: {
          part: 'snippet',
          mine: true,
          maxResults: 50,
          pageToken,
        },
      })

      return response.data
    })
  }
}
