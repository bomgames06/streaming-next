import YoutubeApiBase from '@/services/api/youtube/base/youtubeApiBase.ts'
import type {
  YoutubeApiBaseArrayPaginationType,
  YoutubeApiSubscriptionsListRequest,
  YoutubeApiSubscriptionsListResponse,
} from '@/services/api/youtube/types/youtubeApiTypes.ts'

export default class YoutubeApiSubscriptionsEndpoint extends YoutubeApiBase {
  constructor() {
    super('/subscriptions')
  }

  async list(
    token: string,
    request: YoutubeApiSubscriptionsListRequest
  ): Promise<YoutubeApiBaseArrayPaginationType<YoutubeApiSubscriptionsListResponse>> {
    const params = new URLSearchParams()
    params.append('part', request.part.join(','))
    if (request.mine != null) params.append('mine', request.mine.toString())
    if (request.pageToken) params.append('pageToken', request.pageToken)
    if (request.maxResults != null) params.append('maxResults', request.maxResults.toString())

    const response = await this.axios().get<YoutubeApiBaseArrayPaginationType<YoutubeApiSubscriptionsListResponse>>(
      '',
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    return response.data
  }
  async allList(
    token: string,
    request: Omit<YoutubeApiSubscriptionsListRequest, 'pageToken' | 'maxResults'>
  ): Promise<YoutubeApiSubscriptionsListResponse[]> {
    return this.fetchAll((pageToken) => this.list(token, { ...request, pageToken, maxResults: 50 }))
  }
}
