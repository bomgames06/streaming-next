import { afterEach, describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { browser } from 'wxt/browser'
import TwitchBusiness from '@/services/business/twitchBusiness'
import { mockHttp, page } from '@tests/__utils__/http'
import { twitchServer } from '@tests/__utils__/twitchServer'
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

describe('TwitchBusiness', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Authenticate through the background and fetch the user', async () => {
    mockHttp().get('/users', { data: { data: [apiUser()] } })
    const sendMessageSpy = vi
      .spyOn(browser.runtime, 'sendMessage')
      .mockResolvedValue({ token: 'access-token', expiresAt: 123, refreshToken: 'refresh-token' } as never)

    expect(await TwitchBusiness.auth(true, false)).toStrictEqual({
      token: 'access-token',
      expiresAt: 123,
      refreshToken: 'refresh-token',
      user: { type: 'twitch', id: 'me-id', name: 'Me', login: 'me', avatarUrl: 'https://cdn/me.png' },
    })
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'auth',
      authType: 'twitch',
      forceVerify: true,
      interactive: false,
    })
  })
  it('Validate the token on the Twitch OAuth server', async () => {
    const { http, data } = twitchServer()

    expect(await TwitchBusiness.validateToken('token')).toBe(true)
    expect(http.requests.at(-1)!.headers.Authorization).toBe('OAuth token')

    data.tokenInvalid = true
    expect(await TwitchBusiness.validateToken('token')).toBe(false)
  })
  it('Revoke through the background', async () => {
    const sendMessageSpy = vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(true as never)

    await TwitchBusiness.revoke('token')

    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'revoke', authType: 'twitch', token: 'token' })
  })
  it('Map online followed streams with the verified flag', async () => {
    const http = mockHttp()
      .get('/streams/followed', page([apiStream(), apiStream({ id: 's2', user_id: '2', user_login: 'bravo' })]))
      .get('/users', { data: { data: [apiUser({ id: '1', broadcaster_type: 'partner' })] } })

    const items = await TwitchBusiness.getStreamersOnlineFollowed('token', 'me-id')

    expect(items.map(({ id, verified }) => ({ id, verified }))).toStrictEqual([
      { id: '1', verified: true },
      { id: '2', verified: false },
    ])
    expect(items[0]).toMatchObject({
      type: 'twitch',
      status: 'online',
      login: 'alpha',
      name: 'Alpha',
      title: 'Alpha title',
      gameId: 'game-1',
      game: 'Minecraft',
      viewerCount: 10,
    })
    expect(items[0].startedAt.toISOString()).toBe(moment('2026-10-23T10:00:00Z').toISOString())
    const previewImage = items[0].previewImage as (width: number, height: number, dump?: string) => string
    expect(previewImage(290.4, 163.1)).toBe('https://preview/alpha-290x163.jpg')
    expect(previewImage(290, 163, '123')).toBe('https://preview/alpha-290x163.jpg&dump=123')
    expect(http.find('/users')[0].query.getAll('id')).toStrictEqual(['1', '2'])
  })
  it('Skip the users request when asked or without streams', async () => {
    const http = mockHttp().get('/streams/followed', page([apiStream()]))

    expect(await TwitchBusiness.getStreamersOnlineFollowed('token', 'me-id', true)).toHaveLength(1)
    http.get('/streams/followed', page([]))
    expect(await TwitchBusiness.getStreamersOnlineFollowed('token', 'me-id')).toStrictEqual([])
    expect(http.find('/users')).toHaveLength(0)
  })
  it('Map followed channels to streams', async () => {
    const http = mockHttp()
      .get('/channels/followed', page([apiFollowed()]))
      .get('/users', {
        data: { data: [apiUser({ id: '1', login: 'alpha', display_name: 'Alpha', broadcaster_type: 'partner' })] },
      })

    expect(await TwitchBusiness.getStreamersFollowed('token', 'me-id')).toStrictEqual([
      {
        type: 'twitch',
        status: 'stream',
        id: '1',
        login: 'alpha',
        name: 'Alpha',
        profileImage: 'https://cdn/me.png',
        verified: true,
      },
    ])

    http.get('/channels/followed', page([]))
    expect(await TwitchBusiness.getStreamersFollowed('token', 'me-id')).toStrictEqual([])
    expect(http.find('/users')).toHaveLength(1)
  })
  it('Get users by ids', async () => {
    const http = mockHttp().get('/users', { data: { data: [apiUser()] } })

    expect(await TwitchBusiness.getUsersByIds('token', [])).toStrictEqual([])
    expect(http.requests).toHaveLength(0)
    expect(await TwitchBusiness.getUsersByIds('token', ['me-id'])).toStrictEqual([
      { type: 'twitch', id: 'me-id', name: 'Me', login: 'me', avatarUrl: 'https://cdn/me.png' },
    ])
  })
  it('Map archived videos', async () => {
    const http = mockHttp().get(
      '/videos',
      page(
        [apiVideo(), apiVideo({ id: 'v2', thumbnail_url: 'https://vod-secure.twitch.tv/_404/404_processing.png' })],
        'next'
      )
    )

    const response = await TwitchBusiness.getUserVideosArchive('token', '1', 'views', 'cursor', 20)

    expect(response.cursor).toBe('next')
    expect(response.items[0]).toMatchObject({
      type: 'twitch',
      id: 'v1',
      status: 'video',
      name: 'Alpha',
      login: 'alpha',
      title: 'Video title',
      url: 'https://twitch.tv/videos/v1',
      viewerCount: 1500,
      duration: 3723,
    })
    expect(response.items[0].previewImage!(320, 180)).toBe('https://preview/video-320x180.jpg')
    expect(response.items[0].previewImage!(320, 180, 'd')).toBe('https://preview/video-320x180.jpg&dump=d')
    expect(response.items[1].previewImage!(320, 180)).toBe('')
    expect(Object.fromEntries(http.requests[0].query)).toStrictEqual({
      user_id: '1',
      sort: 'views',
      type: 'archive',
      first: '20',
      after: 'cursor',
    })

    await TwitchBusiness.getUserVideosArchive('token', '1')
    expect(http.requests[1].query.toString()).toBe('user_id=1&type=archive')
  })
  it('Map clips filtering by period', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'))
    const http = mockHttp().get('/clips', page([apiClip()], 'next'))

    const response = await TwitchBusiness.getUserClips('token', '1', '24h', 'cursor', 20)

    expect(response.cursor).toBe('next')
    expect(response.items[0]).toMatchObject({
      type: 'twitch',
      id: 'c1',
      status: 'clip',
      name: 'Alpha',
      login: 'Alpha',
      title: 'Clip title',
      url: 'https://clips.twitch.tv/c1',
      viewerCount: 20,
      duration: 29.6,
      previewImage: 'https://preview/clip.jpg',
    })
    expect(http.requests[0].query.get('started_at')).toBe('2026-10-22T12:00:00.000Z')

    await TwitchBusiness.getUserClips('token', '1', 'all')
    expect(http.requests[1].query.toString()).toBe('broadcaster_id=1')
  })
  it('Map top games', async () => {
    const http = mockHttp().get('/games/top', page([apiGame()], 'next'))

    expect(await TwitchBusiness.getTopGamesCategory('token', 'cursor', 99)).toStrictEqual({
      cursor: 'next',
      items: [
        {
          type: 'twitch',
          id: 'game-1',
          name: 'Minecraft',
          boxArtUrl: 'https://box/minecraft-{width}x{height}.jpg',
          igdbId: 'igdb-1',
        },
      ],
    })
    expect(http.requests[0].query.toString()).toBe('first=99&after=cursor')
    await TwitchBusiness.getTopGamesCategory('token')
    expect(http.requests[1].query.toString()).toBe('')
  })
  it('Map streams by category', async () => {
    const http = mockHttp().get('/streams', page([apiStream()], 'next'))

    const response = await TwitchBusiness.getStreamsByCategory('token', 'game-1', ['pt', 'en'], 'cursor', 20)

    expect(response.cursor).toBe('next')
    expect(response.items[0]).toMatchObject({ id: '1', status: 'online', verified: false })
    expect(http.requests[0].query.toString()).toBe('game_id=game-1&language=pt&language=en&first=20&after=cursor')
    await TwitchBusiness.getStreamsByCategory('token', 'game-1')
    expect(http.requests[1].query.toString()).toBe('game_id=game-1')
  })
  it('Get a category by id', async () => {
    const http = mockHttp().get('/games', page([apiGame()]))

    expect(await TwitchBusiness.getCategoryById('token', 'game-1')).toMatchObject([{ id: 'game-1', name: 'Minecraft' }])
    expect(http.requests[0].query.toString()).toBe('id=game-1')
  })
  it('Map searched channels as online or offline', async () => {
    const http = mockHttp()
      .get(
        '/search/channels',
        page(
          [
            apiSearchChannel(),
            apiSearchChannel({ id: '2', broadcaster_login: 'bravo', display_name: 'Bravo', is_live: false }),
          ],
          'next'
        )
      )
      .get('/users', { data: { data: [apiUser({ id: '2', broadcaster_type: 'partner' })] } })

    const response = await TwitchBusiness.searchChannels('token', 'a', 'cursor', 100)

    expect(response.cursor).toBe('next')
    expect(response.items[0]).toMatchObject({
      type: 'twitch',
      status: 'online',
      id: '1',
      login: 'alpha',
      name: 'Alpha',
      title: 'Alpha title',
      gameId: 'game-1',
      game: 'Minecraft',
      previewImage: 'https://preview/alpha.jpg',
      verified: false,
    })
    expect(response.items[1]).toStrictEqual({
      type: 'twitch',
      status: 'offline',
      id: '2',
      login: 'bravo',
      name: 'Bravo',
      profileImage: 'https://preview/alpha.jpg',
      verified: true,
    })
    expect(http.requests[0].query.toString()).toBe('query=a&first=100&after=cursor')

    http.get('/search/channels', page([]))
    expect((await TwitchBusiness.searchChannels('token', 'a')).items).toStrictEqual([])
    expect(http.find('/users')).toHaveLength(1)
  })
  it('Map searched categories', async () => {
    mockHttp().get('/search/categories', page([apiSearchCategory()], 'next'))

    expect(await TwitchBusiness.searchCategories('token', 'mine', undefined, 100)).toStrictEqual({
      cursor: 'next',
      items: [{ type: 'twitch', id: 'game-1', name: 'Minecraft', imageUrl: 'https://box/minecraft-52x72.jpg' }],
    })
  })
  it('Fetch categories by ids and names in chunks of 100', async () => {
    const http = mockHttp().get('/games', (request) => ({
      data: {
        data: [...request.query.getAll('id'), ...request.query.getAll('name')].map((value) =>
          apiGame({ id: value, name: value })
        ),
      },
    }))
    const values = Array.from({ length: 101 }, (_, i) => String(i))

    expect((await TwitchBusiness.fetchCategoriesByIds('token', values)).map((item) => item.id)).toStrictEqual(values)
    expect(
      (await TwitchBusiness.fetchCategoriesByNames('token', ['Minecraft'])).map((item) => item.name)
    ).toStrictEqual(['Minecraft'])
    expect(http.requests.map((request) => request.query.toString().split('&').length)).toStrictEqual([100, 1, 1])
    expect(http.requests[2].query.toString()).toBe('name=Minecraft')
  })
})
