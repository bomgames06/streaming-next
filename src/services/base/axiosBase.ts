import { Axios } from 'axios'

export default class AxiosBase {
  private readonly _baseUrl: string

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl
  }

  protected axios() {
    return new Axios({
      baseURL: this._baseUrl,
      responseType: 'json',
      validateStatus: (status) => status >= 200 && status < 300,
      transformResponse(data) {
        if (this.responseType === 'json') {
          return JSON.parse(data)
        }
        return data
      },
    })
  }
}
