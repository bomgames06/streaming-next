import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type {
  TwitchApiBaseArrayType,
  TwitchApiClipRequestType,
  TwitchApiClipType,
} from '@/services/api/twitch/types/twitchApiType'

export default class TwitchApiClipsEndpoint extends TwitchApiBase {
  constructor() {
    super('/clips')
  }

  async clips(token: string, request: TwitchApiClipRequestType): Promise<TwitchApiBaseArrayType<TwitchApiClipType>> {
    const params = new URLSearchParams()
    if (request.id) request.id.forEach((value) => params.append('id', value))
    if (request.broadcaster_id) request.broadcaster_id.forEach((value) => params.append('broadcaster_id', value))
    if (request.game_id) request.game_id.forEach((value) => params.append('game_id', value))
    if (request.started_at) params.append('started_at', request.started_at.toISOString())
    if (request.ended_at) params.append('ended_at', request.ended_at.toISOString())
    if (request.is_featured != undefined) params.append('is_featured', String(request.is_featured))
    if (request.first) params.append('first', request.first)
    if (request.after) params.append('after', request.after)
    if (request.before) params.append('before', request.before)

    const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiClipType>>('', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
      params,
    })

    return response.data
  }
}
