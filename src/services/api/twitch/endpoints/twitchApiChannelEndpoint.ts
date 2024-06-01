import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type { TwitchApiBaseArrayType, TwitchApiChannelFollowedType } from '@/services/api/twitch/types/twitchApiType'

export default class TwitchApiChannelEndpoint extends TwitchApiBase {
  constructor() {
    super('/channels')
  }

  async followed(token: string, userId: string): Promise<TwitchApiChannelFollowedType[]> {
    return this.fetchAll(async (cursor): Promise<TwitchApiBaseArrayType<TwitchApiChannelFollowedType>> => {
      const response = await this.axios().get<TwitchApiBaseArrayType<TwitchApiChannelFollowedType>>('/followed', {
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
}
