import AxiosBase from '@/services/base/axiosBase'
import type { TwitchApiBaseArrayType } from '../types/twitchApiType'
import { type AxiosRequestConfig } from 'axios'
import { emitResponseError } from '@/services/api/twitch/events/twitchApiEvent'

export default class TwitchApiBase extends AxiosBase {
  constructor(path: string) {
    super(`${import.meta.env.VITE_APP_API_TWITCH_URL}${path}`)
  }

  protected axios(config?: AxiosRequestConfig) {
    const axios = super.axios(config)

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        await emitResponseError(error)
        throw error
      }
    )

    return axios
  }

  protected async fetchAll<T>(handler: (cursor?: string) => Promise<TwitchApiBaseArrayType<T>>): Promise<T[]> {
    const items: T[] = []
    let cursor: string | undefined
    do {
      const response = await handler(cursor)
      items.push(...response.data)

      cursor = response.pagination.cursor
    } while (cursor)

    return items
  }
}
