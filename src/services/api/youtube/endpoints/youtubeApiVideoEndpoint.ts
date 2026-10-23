import YoutubeApiBase from '@/services/api/youtube/base/youtubeApiBase'
import type { YoutubeApiBaseListType, YoutubeApiVideoType } from '@/services/api/youtube/types/youtubeApiType'
import { partition } from '@/utils/util'

export default class YoutubeApiVideoEndpoint extends YoutubeApiBase {
  constructor() {
    super('/videos')
  }

  // Costs 1 quota unit for each 50 ids, deleted and private videos are missing from the response
  async videosByIds(token: string, ids: string[]): Promise<YoutubeApiVideoType[]> {
    const responses = await Promise.all(
      partition(ids, 50).map(async (idsPartition) => {
        const response = await this.axios().get<YoutubeApiBaseListType<YoutubeApiVideoType>>('', {
          headers: this.headers(token),
          params: {
            part: 'snippet,liveStreamingDetails',
            id: idsPartition.join(','),
            maxResults: 50,
          },
        })

        return response.data.items ?? []
      })
    )

    return responses.flat()
  }
}
