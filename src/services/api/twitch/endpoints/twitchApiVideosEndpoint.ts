import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type {
  TwitchApiBaseArrayType,
  TwitchApiVideoRequestType,
  TwitchApiVideoType,
} from '@/services/api/twitch/types/twitchApiType'

export default class TwitchApiVideosEndpoint extends TwitchApiBase {
  constructor() {
    super('/videos')
  }

  async videos(token: string, request: TwitchApiVideoRequestType): Promise<TwitchApiBaseArrayType<TwitchApiVideoType>> {
    const params = new URLSearchParams()
    if (request.id) request.id.forEach((value) => params.append('id', value))
    if (request.user_id) request.user_id.forEach((value) => params.append('user_id', value))
    if (request.game_id) request.game_id.forEach((value) => params.append('game_id', value))
    if (request.language) params.append('language', request.language)
    if (request.period) params.append('period', request.period)
    if (request.sort) params.append('sort', request.sort)
    if (request.type) params.append('type', request.type)
    if (request.first) params.append('first', request.first)
    if (request.after) params.append('after', request.after)
    if (request.before) params.append('before', request.before)

    const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiVideoType>>('', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
      params,
    })

    return response.data
  }
}
