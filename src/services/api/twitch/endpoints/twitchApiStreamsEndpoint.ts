import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type {
  TwitchApiBaseArrayType,
  TwitchApiStreamsFollowedType,
  TwitchApiStreamsRequestType,
} from '@/services/api/twitch/types/twitchApiType'

export default class TwitchApiStreamsEndpoint extends TwitchApiBase {
  constructor() {
    super('/streams')
  }

  async followed(token: string, userId: string): Promise<TwitchApiStreamsFollowedType[]> {
    return this.fetchAll(async (cursor): Promise<TwitchApiBaseArrayType<TwitchApiStreamsFollowedType>> => {
      const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiStreamsFollowedType>>('/followed', {
        headers: {
          'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
          Authorization: `Bearer ${token}`,
        },
        params: {
          user_id: userId,
          first: 100,
          after: cursor,
        },
      })

      return response.data
    })
  }

  async stream(
    token: string,
    request: TwitchApiStreamsRequestType
  ): Promise<TwitchApiBaseArrayType<TwitchApiStreamsFollowedType>> {
    const params = new URLSearchParams()
    if (request.user_id) request.user_id.forEach((value) => params.append('user_id', value))
    if (request.user_login) request.user_login.forEach((value) => params.append('user_login', value))
    if (request.game_id) request.game_id.forEach((value) => params.append('game_id', value))
    if (request.type) params.append('type', request.type)
    if (request.language) params.append('language', request.language)
    if (request.first) params.append('first', request.first)
    if (request.after) params.append('after', request.after)
    if (request.before) params.append('before', request.before)

    const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiStreamsFollowedType>>('', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
      params,
    })

    return response.data
  }
}
