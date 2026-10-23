import AxiosBase from '@/services/base/axiosBase'
import type { YoutubeApiBaseListType } from '../types/youtubeApiType'
import { type AxiosRequestConfig } from 'axios'
import { emitResponseError } from '@/services/api/youtube/events/youtubeApiEvent'

export default class YoutubeApiBase extends AxiosBase {
  constructor(path: string) {
    super(`${import.meta.env.VITE_APP_API_YOUTUBE_URL}${path}`)
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

  protected headers(token: string) {
    return { Authorization: `Bearer ${token}` }
  }

  protected async fetchAll<T>(handler: (pageToken?: string) => Promise<YoutubeApiBaseListType<T>>): Promise<T[]> {
    const items: T[] = []
    let pageToken: string | undefined
    do {
      const response = await handler(pageToken)
      items.push(...(response.items ?? []))

      pageToken = response.nextPageToken
    } while (pageToken)

    return items
  }
}
