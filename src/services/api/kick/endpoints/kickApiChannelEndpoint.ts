import KickApiBase from '@/services/api/kick/base/kickApiBase'
import type { KickApiBaseType, KickApiChannelType } from '@/services/api/kick/types/kickApiType'

export default class KickApiChannelEndpoint extends KickApiBase {
  constructor() {
    super('/channels')
  }

  /** Channel of the token user */
  async self(token: string): Promise<KickApiChannelType | undefined> {
    const response = await this.axios().get<KickApiBaseType<KickApiChannelType[]>>('', { headers: this.headers(token) })

    return response.data.data[0]
  }

  /** Unknown slugs are missing on the answer */
  async bySlugs(token: string, slugs: string[]): Promise<KickApiChannelType[]> {
    return this.fetchByFilter(
      slugs,
      async (params) => {
        const response = await this.axios().get<KickApiBaseType<KickApiChannelType[]>>('', {
          headers: this.headers(token),
          params,
        })
        return response.data.data
      },
      'slug'
    )
  }
}
