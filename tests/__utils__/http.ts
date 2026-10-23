import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { onTestFinished } from 'vitest'

export type HttpRequest = {
  method: string
  url: string
  path: string
  query: URLSearchParams
  headers: Record<string, unknown>
}
// `text` is sent as is (like XML), `data` is sent as JSON
export type HttpResponse = { status?: number; data?: unknown; text?: string }
type Route = {
  method: string
  path: string | RegExp
  handler: (request: HttpRequest) => HttpResponse | Promise<HttpResponse>
}

const TWITCH_API_URL = import.meta.env.VITE_APP_API_TWITCH_URL

function toQuery(params: unknown): URLSearchParams {
  if (params instanceof URLSearchParams) return new URLSearchParams(params)
  const query = new URLSearchParams()
  Object.entries((params as Record<string, unknown>) || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.append(key, String(value))
  })
  return query
}

/**
 * Replace the axios network layer with in-memory routes, keeping every real request/response code path
 * (interceptors, transformResponse, validateStatus). Paths are relative to the Twitch API url.
 */
export function mockHttp() {
  const routes: Route[] = []
  const requests: HttpRequest[] = []

  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const url = `${config.baseURL || ''}${config.url || ''}`
    const request: HttpRequest = {
      method: (config.method || 'get').toLowerCase(),
      url,
      path: url.startsWith(TWITCH_API_URL) ? url.substring(TWITCH_API_URL.length) : url,
      query: toQuery(config.params),
      headers: AxiosHeaders.from(config.headers).toJSON(),
    }
    requests.push(request)

    const route = [...routes]
      .reverse()
      .find(
        (value) =>
          value.method === request.method &&
          (typeof value.path === 'string' ? value.path === request.path : value.path.test(request.path))
      )
    const result: HttpResponse = route ? await route.handler(request) : { status: 404, data: { message: 'Not found' } }
    const status = result.status ?? 200
    const response = {
      data: result.text ?? (result.data === undefined ? '' : JSON.stringify(result.data)),
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    }
    // Like the real adapters (settle), transformResponse is applied later by axios itself
    if (config.validateStatus && !config.validateStatus(status))
      throw new AxiosError(
        `Request failed with status code ${status}`,
        AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response
      )
    return response
  }

  const previousAdapter = axios.defaults.adapter
  axios.defaults.adapter = adapter
  onTestFinished(() => {
    axios.defaults.adapter = previousAdapter
  })

  const http = {
    requests,
    on(method: string, path: string | RegExp, handler: Route['handler'] | HttpResponse) {
      routes.push({ method, path, handler: typeof handler === 'function' ? handler : () => handler })
      return http
    },
    get(path: string | RegExp, handler: Route['handler'] | HttpResponse) {
      return http.on('get', path, handler)
    },
    find(path: string) {
      return requests.filter((request) => request.path === path)
    },
  }
  return http
}

export function page<T>(data: T[], cursor?: string) {
  return { data: { data, pagination: cursor ? { cursor } : {} } }
}
