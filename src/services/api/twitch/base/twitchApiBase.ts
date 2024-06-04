import AxiosBase from '@/services/base/axiosBase'
import type { TwitchApiBaseArrayType } from '../types/twitchApiType'
import { type AxiosRequestConfig, HttpStatusCode, isAxiosError } from 'axios'
import useSystemStore from '@/store/system/useSystemStore'

export default class TwitchApiBase extends AxiosBase {
  constructor(path: string) {
    super(`${import.meta.env.VITE_APP_API_TWITCH_URL}${path}`)
  }

  protected axios(config?: AxiosRequestConfig) {
    const axios = super.axios(config)

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error)) {
          if (error.response?.status === HttpStatusCode.Unauthorized) {
            const system = useSystemStore()
            const token = String(error.config?.headers.Authorization || '').substring('Bearer '.length)
            system.invalidAccountByToken(token)
          }
        }
        return Promise.reject(error)
      }
    )

    return axios
  }

  protected async fetchAll<T>(handler: (cursor?: string) => Promise<TwitchApiBaseArrayType<T>>): Promise<T[]> {
    const items: T[] = []
    let cursor: string | undefined = undefined
    do {
      const response = await handler(cursor)
      items.push(...response.data)

      cursor = response.pagination.cursor
    } while (cursor)

    return items
  }
}
