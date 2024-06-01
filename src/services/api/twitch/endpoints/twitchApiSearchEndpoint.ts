import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type {
  TwitchApiBaseArrayType,
  TwitchApiSearchChannelRequestType,
  TwitchApiSearchChannelType,
} from '@/services/api/twitch/types/twitchApiType'

export default class TwitchApiSearchEndpoint extends TwitchApiBase {
  constructor() {
    super('/search')
  }

  async channels(
    token: string,
    request: TwitchApiSearchChannelRequestType
  ): Promise<TwitchApiBaseArrayType<TwitchApiSearchChannelType>> {
    const params = new URLSearchParams()
    params.append('query', request.query.trim())
    if (request.live_only != undefined) params.append('live_only', String(request.live_only))
    if (request.first) params.append('first', request.first)
    if (request.after) params.append('after', request.after)
    if (request.before) params.append('before', request.before)
    const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiSearchChannelType>>('/channels', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
      params,
    })

    return response.data
  }
}
