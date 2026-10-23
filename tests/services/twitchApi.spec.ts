import { describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import TwitchApi from '@/services/api/twitch/twitchApi'
import AxiosBase from '@/services/base/axiosBase'
import {
  emitResponseError,
  offResponseError,
  onResponseError,
  responseErrorHandlers,
} from '@/services/api/twitch/events/twitchApiEvent'
import { mockHttp, page } from '@tests/__utils__/http'
import {
  apiClip,
  apiFollowed,
  apiGame,
  apiSearchCategory,
  apiSearchChannel,
  apiStream,
  apiUser,
  apiVideo,
} from '@tests/__utils__/fixtures'

const CLIENT_ID = import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID

describe('Twitch API', () => {
  describe('AxiosBase', () => {
    class TestApi extends AxiosBase {
      get(config?: Parameters<AxiosBase['axios']>[0]) {
        return this.axios(config).get('/path')
      }
    }

    it('Parse JSON bodies and keep empty bodies', async () => {
      const http = mockHttp().get('https://base/path', { data: { value: 1 } })
      const api = new TestApi('https://base')

      expect((await api.get()).data).toStrictEqual({ value: 1 })

      http.get('https://base/path', { status: 204 })
      expect((await api.get()).data).toBe('')
    })
    it('Do not parse when another response type is requested', async () => {
      mockHttp().get('https://base/path', { data: { value: 1 } })

      expect((await new TestApi('https://base').get({ responseType: 'text' })).data).toBe('{"value":1}')
    })
    it('Reject statuses outside 2xx', async () => {
      mockHttp().get('https://base/path', { status: 500, data: {} })

      await expect(new TestApi('https://base').get()).rejects.toBeInstanceOf(AxiosError)
    })
  })

  describe('Response error event', () => {
    it('Register, emit and remove handlers in order', async () => {
      const calls: string[] = []
      const first = vi.fn(() => void calls.push('first'))
      const second = vi.fn(async () => void calls.push('second'))
      onResponseError(first)
      onResponseError(second)

      await emitResponseError('error')
      expect(calls).toStrictEqual(['first', 'second'])
      expect(first).toHaveBeenCalledWith('error')

      offResponseError(first)
      offResponseError(second)
      expect(responseErrorHandlers).not.toContain(first)
      expect(responseErrorHandlers).not.toContain(second)
    })
    it('Notify handlers on failed requests and rethrow', async () => {
      mockHttp().get('/users', { status: 401, data: {} })
      const handler = vi.fn()
      onResponseError(handler)

      await expect(TwitchApi.users.self('token')).rejects.toBeInstanceOf(AxiosError)
      expect(handler).toHaveBeenCalledOnce()
      expect((handler.mock.lastCall![0] as AxiosError).response?.status).toBe(401)

      offResponseError(handler)
    })
  })

  describe('users', () => {
    it('Get the authenticated user with the client headers', async () => {
      const http = mockHttp().get('/users', { data: { data: [apiUser()] } })

      expect(await TwitchApi.users.self('token')).toStrictEqual(apiUser())
      expect(http.requests[0].headers).toMatchObject({ 'Client-ID': CLIENT_ID, Authorization: 'Bearer token' })
    })
    it('Get users by ids in chunks of 100', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => String(i))
      const http = mockHttp().get('/users', (request) => ({
        data: { data: request.query.getAll('id').map((id) => apiUser({ id })) },
      }))

      const users = await TwitchApi.users.usersByIds('token', ids)

      expect(users.map((user) => user.id)).toStrictEqual(ids)
      expect(http.requests.map((request) => request.query.getAll('id').length)).toStrictEqual([100, 50])
    })
    it('Do not request without ids', async () => {
      const http = mockHttp()

      expect(await TwitchApi.users.usersByIds('token', [])).toStrictEqual([])
      expect(http.requests).toHaveLength(0)
    })
  })

  describe('channels', () => {
    it('Fetch every followed channel page', async () => {
      const http = mockHttp().get('/channels/followed', (request) =>
        request.query.get('after')
          ? page([apiFollowed({ broadcaster_id: '2' })])
          : page([apiFollowed({ broadcaster_id: '1' })], 'cursor-1')
      )

      const items = await TwitchApi.channels.followed('token', 'me-id')

      expect(items.map((item) => item.broadcaster_id)).toStrictEqual(['1', '2'])
      expect(http.requests.map((request) => Object.fromEntries(request.query))).toStrictEqual([
        { user_id: 'me-id', first: '100' },
        { user_id: 'me-id', first: '100', after: 'cursor-1' },
      ])
    })
  })

  describe('streams', () => {
    it('Fetch every followed stream page', async () => {
      const http = mockHttp().get('/streams/followed', (request) =>
        request.query.get('after') ? page([apiStream({ id: 'b' })]) : page([apiStream({ id: 'a' })], 'next')
      )

      expect((await TwitchApi.streams.followed('token', 'me-id')).map((item) => item.id)).toStrictEqual(['a', 'b'])
      expect(http.requests).toHaveLength(2)
    })
    it('Send every stream filter', async () => {
      const http = mockHttp().get('/streams', page([apiStream()], 'next'))

      const response = await TwitchApi.streams.stream('token', {
        user_id: ['1', '2'],
        user_login: ['alpha'],
        game_id: ['game-1'],
        type: 'live',
        language: ['en', 'pt'],
        first: '20',
        after: 'a',
        before: 'b',
      })

      expect(response.pagination.cursor).toBe('next')
      expect(http.requests[0].query.toString()).toBe(
        'user_id=1&user_id=2&user_login=alpha&game_id=game-1&type=live&language=en&language=pt&first=20&after=a&before=b'
      )
    })
    it('Send no filter when none is given', async () => {
      const http = mockHttp().get('/streams', page([]))

      await TwitchApi.streams.stream('token', {})

      expect(http.requests[0].query.toString()).toBe('')
    })
  })

  describe('videos', () => {
    it('Send every video filter', async () => {
      const http = mockHttp().get('/videos', page([apiVideo()]))

      const response = await TwitchApi.videos.videos('token', {
        id: ['v1'],
        user_id: ['1'],
        game_id: ['game-1'],
        language: 'en',
        period: 'week',
        sort: 'views',
        type: 'archive',
        first: '20',
        after: 'a',
        before: 'b',
      })

      expect(response.data).toStrictEqual([apiVideo()])
      expect(http.requests[0].query.toString()).toBe(
        'id=v1&user_id=1&game_id=game-1&language=en&period=week&sort=views&type=archive&first=20&after=a&before=b'
      )
    })
    it('Send only the required filter', async () => {
      const http = mockHttp().get('/videos', page([]))

      await TwitchApi.videos.videos('token', { user_id: ['1'] })
      await TwitchApi.videos.videos('token', { game_id: ['g'] })

      expect(http.requests.map((request) => request.query.toString())).toStrictEqual(['user_id=1', 'game_id=g'])
    })
  })

  describe('clips', () => {
    it('Send every clip filter', async () => {
      const http = mockHttp().get('/clips', page([apiClip()]))
      const startedAt = new Date('2026-10-01T00:00:00Z')
      const endedAt = new Date('2026-10-02T00:00:00Z')

      const response = await TwitchApi.clips.clips('token', {
        id: ['c1'],
        broadcaster_id: ['1'],
        game_id: ['game-1'],
        started_at: startedAt,
        ended_at: endedAt,
        is_featured: false,
        first: '20',
        after: 'a',
        before: 'b',
      })

      expect(response.data).toStrictEqual([apiClip()])
      expect(Object.fromEntries(http.requests[0].query)).toStrictEqual({
        id: 'c1',
        broadcaster_id: '1',
        game_id: 'game-1',
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        is_featured: 'false',
        first: '20',
        after: 'a',
        before: 'b',
      })
    })
    it('Send only the required filter', async () => {
      const http = mockHttp().get('/clips', page([]))

      await TwitchApi.clips.clips('token', { broadcaster_id: ['1'] })
      await TwitchApi.clips.clips('token', { id: ['c1'] })

      expect(http.requests.map((request) => request.query.toString())).toStrictEqual(['broadcaster_id=1', 'id=c1'])
    })
  })

  describe('games', () => {
    it('Get top games with pagination', async () => {
      const http = mockHttp().get('/games/top', page([apiGame()], 'next'))

      const response = await TwitchApi.games.top('token', { first: '99', after: 'a', before: 'b' })

      expect(response).toStrictEqual({ data: [apiGame()], pagination: { cursor: 'next' } })
      expect(http.requests[0].query.toString()).toBe('first=99&after=a&before=b')

      await TwitchApi.games.top('token', {})
      expect(http.requests[1].query.toString()).toBe('')
    })
    it('Get games by id, name or igdb id', async () => {
      const http = mockHttp().get('/games', page([apiGame()]))

      expect(await TwitchApi.games.games('token', { id: ['1'], name: ['Minecraft'], igdb_id: ['2'] })).toStrictEqual([
        apiGame(),
      ])
      expect(http.requests[0].query.toString()).toBe('id=1&name=Minecraft&igdb_id=2')

      await TwitchApi.games.games('token', { name: ['Minecraft'] })
      expect(http.requests[1].query.toString()).toBe('name=Minecraft')
    })
  })

  describe('search', () => {
    it('Search channels trimming the query', async () => {
      const http = mockHttp().get('/search/channels', page([apiSearchChannel()]))

      const response = await TwitchApi.search.channels('token', {
        query: '  alpha  ',
        live_only: true,
        first: '100',
        after: 'a',
        before: 'b',
      })

      expect(response.data).toStrictEqual([apiSearchChannel()])
      expect(http.requests[0].query.toString()).toBe('query=alpha&live_only=true&first=100&after=a&before=b')

      await TwitchApi.search.channels('token', { query: 'alpha' })
      expect(http.requests[1].query.toString()).toBe('query=alpha')
    })
    it('Search categories trimming the query', async () => {
      const http = mockHttp().get('/search/categories', page([apiSearchCategory()]))

      const response = await TwitchApi.search.categories('token', { query: ' mine ', first: '100', after: 'a' })

      expect(response.data).toStrictEqual([apiSearchCategory()])
      expect(http.requests[0].query.toString()).toBe('query=mine&first=100&after=a')

      await TwitchApi.search.categories('token', { query: 'mine' })
      expect(http.requests[1].query.toString()).toBe('query=mine')
    })
  })
})
