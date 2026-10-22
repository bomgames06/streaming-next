import type { AxiosRequestConfig } from 'axios'
import { Axios } from 'axios'

export default class AxiosBase {
  private readonly _baseUrl: string

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl
  }

  protected axios(config?: AxiosRequestConfig) {
    return new Axios({
      baseURL: this._baseUrl,
      responseType: 'json',
      validateStatus: (status) => status >= 200 && status < 300,
      transformResponse(data) {
        // Empty bodies (e.g. 204) are not valid JSON
        if (this.responseType === 'json' && typeof data === 'string' && data) {
          return JSON.parse(data)
        }
        return data
      },
      ...config,
    })
  }
}
