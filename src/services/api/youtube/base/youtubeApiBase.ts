import AxiosBase from '@/services/base/axiosBase'
import { emitResponseError } from '@/services/events/tokenApiEvent.ts'
import type { YoutubeApiBaseArrayPaginationType } from '@/services/api/youtube/types/youtubeApiTypes.ts'

export default class YoutubeApiBase extends AxiosBase {
  constructor(path: string) {
    super(`${import.meta.env.VITE_APP_API_YOUTUBE_URL}${path}`)
  }

  protected axios() {
    const axios = super.axios()

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        await emitResponseError(error)
        throw error
      }
    )

    return axios
  }

  protected async fetchAll<T>(
    handler: (pageToken?: string) => Promise<YoutubeApiBaseArrayPaginationType<T>>
  ): Promise<T[]> {
    const items: T[] = []
    let cursor: string | undefined
    do {
      const response = await handler(cursor)
      items.push(...response.items)

      cursor = response.nextPageToken
    } while (cursor)

    return items
  }
}
