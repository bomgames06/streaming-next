import AxiosBase from '@/services/base/axiosBase'
import { type AxiosRequestConfig } from 'axios'
import { emitResponseError } from '@/services/api/kick/events/kickApiEvent'
import { partition } from '@/utils/util'

// The list endpoints take at most 50 values of a filter
const KICK_FILTER_LIMIT = 50

export default class KickApiBase extends AxiosBase {
  constructor(path: string) {
    super(`${import.meta.env.VITE_APP_API_KICK_URL}${path}`)
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

  /** Splits the filter values in requests of the size the API allows */
  protected async fetchByFilter<T, V>(
    values: V[],
    handler: (params: URLSearchParams) => Promise<T[]>,
    filter: string
  ): Promise<T[]> {
    const pages = await Promise.all(
      partition(values, KICK_FILTER_LIMIT).map((page) => {
        const params = new URLSearchParams()
        page.forEach((value) => params.append(filter, String(value)))
        return handler(params)
      })
    )

    return pages.flat()
  }
}
