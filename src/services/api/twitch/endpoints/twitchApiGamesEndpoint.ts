import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type {
  TwitchApiBaseArrayType,
  TwitchApiGamesRequestType,
  TwitchApiGameTopRequestType,
  TwitchApiGameType,
} from '@/services/api/twitch/types/twitchApiType'

export default class TwitchApiGamesEndpoint extends TwitchApiBase {
  constructor() {
    super('/games')
  }

  async top(token: string, request: TwitchApiGameTopRequestType): Promise<TwitchApiBaseArrayType<TwitchApiGameType>> {
    const params = new URLSearchParams()
    if (request.first) params.append('first', request.first)
    if (request.after) params.append('after', request.after)
    if (request.before) params.append('before', request.before)

    const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiGameType>>('/top', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
      params,
    })

    return response.data
  }

  async games(token: string, request: TwitchApiGamesRequestType): Promise<TwitchApiGameType[]> {
    const params = new URLSearchParams()
    if (request.id) request.id.forEach((value) => params.append('id', value))
    if (request.name) request.name.forEach((value) => params.append('name', value))
    if (request.igdb_id) request.igdb_id.forEach((value) => params.append('igdb_id', value))

    const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiGameType>>('', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
      params,
    })

    return response.data.data
  }
}
