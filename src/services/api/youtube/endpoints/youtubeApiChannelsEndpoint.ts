import YoutubeApiBase from '@/services/api/youtube/base/youtubeApiBase.ts'
import type {
  YoutubeApiBaseArrayType,
  YoutubeApiChannelsListRequest,
  YoutubeApiChannelsListResponse,
} from '@/services/api/youtube/types/youtubeApiTypes.ts'

export default class YoutubeApiChannelsEndpoint extends YoutubeApiBase {
  constructor() {
    super('/channels')
  }

  async list(
    token: string,
    request: YoutubeApiChannelsListRequest
  ): Promise<YoutubeApiBaseArrayType<YoutubeApiChannelsListResponse>> {
    const params = new URLSearchParams()
    params.append('part', request.part.join(','))
    if (request.mine != null) params.append('mine', request.mine.toString())

    const response = await this.axios().get<YoutubeApiBaseArrayType<YoutubeApiChannelsListResponse>>('', {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data
  }
}
