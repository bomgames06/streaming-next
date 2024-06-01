import TwitchApiBase from '@/services/api/twitch/base/twitchApiBase'
import type { TwitchApiBaseSingleType, TwitchApiUserType } from '@/services/api/twitch/types/twitchApiType'
import { partition } from '@/utils/util'

export default class TwitchApiUserEndpoint extends TwitchApiBase {
  constructor() {
    super('/users')
  }

  async self(token: string): Promise<TwitchApiUserType> {
    const response = await this.axios().get<TwitchApiBaseSingleType<TwitchApiUserType[]>>('', {
      headers: {
        'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data.data[0]
  }

  async usersByIds(token: string, ids: string[]): Promise<TwitchApiUserType[]> {
    const partitionValues = partition(ids, 100)
    const items: TwitchApiUserType[] = []

    const fn = async (values: string[]): Promise<TwitchApiUserType[]> => {
      const params = new URLSearchParams()
      values && values.forEach((id) => params.append('id', id))
      const response = await this.axios().get<TwitchApiBaseSingleType<TwitchApiUserType[]>>('', {
        params,
        headers: {
          'Client-ID': import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
          Authorization: `Bearer ${token}`,
        },
      })

      return response.data.data
    }

    const promises: Promise<TwitchApiUserType[]>[] = []
    partitionValues.forEach((values) => promises.push(fn(values)))

    const responses = await Promise.all(promises)
    responses.forEach((value) => items.push(...value))

    return items
  }
}
