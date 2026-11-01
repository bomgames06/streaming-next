import KickApiBase from '@/services/api/kick/base/kickApiBase'
import type { KickApiBaseType, KickApiUserType } from '@/services/api/kick/types/kickApiType'

export default class KickApiUserEndpoint extends KickApiBase {
  constructor() {
    super('/users')
  }

  /** User of the token */
  async self(token: string): Promise<KickApiUserType | undefined> {
    const response = await this.axios().get<KickApiBaseType<KickApiUserType[]>>('', { headers: this.headers(token) })

    return response.data.data[0]
  }

  async byIds(token: string, ids: number[]): Promise<KickApiUserType[]> {
    return this.fetchByFilter(
      ids,
      async (params) => {
        const response = await this.axios().get<KickApiBaseType<KickApiUserType[]>>('', {
          headers: this.headers(token),
          params,
        })
        return response.data.data
      },
      'id'
    )
  }
}
