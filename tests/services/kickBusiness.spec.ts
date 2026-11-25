import { describe, expect, it } from 'vitest'
import { browser } from 'wxt/browser'
import KickBusiness, { kickSlugOf } from '@/services/business/kickBusiness'
import { STORAGE_KEY_KICK_CHANNELS } from '@/types/syncStorageKeysTypes'
import type { KickApiChannelType, KickApiUserType } from '@/services/api/kick/types/kickApiType'
import { mockHttp } from '@tests/__utils__/http'

const KICK_API_URL = import.meta.env.VITE_APP_API_KICK_URL

function apiKickChannel(id: number, slug: string, live?: boolean): KickApiChannelType {
  return {
    broadcaster_user_id: id,
    slug,
    stream_title: `${slug} title`,
    category: { id: 15, name: 'Just Chatting' },
    stream: {
      is_live: !!live,
      is_mature: false,
      language: 'en',
      start_time: live ? '2026-11-01T10:00:00Z' : '',
      thumbnail: live ? `https://images.kick.com/${slug}.webp` : '',
      viewer_count: live ? 120 : 0,
    },
  }
}

/** Kick API on top of mockHttp, the channels and users answer only the asked slugs and ids */
function kickServer(channels: KickApiChannelType[], users: KickApiUserType[]) {
  return mockHttp()
    .get(`${KICK_API_URL}/channels`, (request) => {
      const slugs = request.query.getAll('slug')
      return { data: { data: slugs.length ? channels.filter((value) => slugs.includes(value.slug)) : [channels[0]] } }
    })
    .get(`${KICK_API_URL}/users`, (request) => {
      const ids = request.query.getAll('id').map(Number)
      return { data: { data: ids.length ? users.filter((value) => ids.includes(value.user_id)) : [users[0]] } }
    })
}

describe('kickSlugOf', () => {
  it('takes the slug of names and urls', () => {
    expect(kickSlugOf('  Some_Name ')).toBe('some_name')
    expect(kickSlugOf('https://kick.com/Some-Name/')).toBe('some-name')
    expect(kickSlugOf('www.kick.com/name?tab=videos')).toBe('name')
    expect(kickSlugOf('')).toBe('')
  })
})

describe('KickBusiness', () => {
  const channels = [apiKickChannel(1, 'alpha', true), apiKickChannel(2, 'beta')]
  const users: KickApiUserType[] = [
    { user_id: 1, name: 'Alpha', profile_picture: 'https://files.kick.com/alpha.webp' },
    { user_id: 2, name: 'Beta' },
  ]

  it('gets the channels of the slugs with their lives', async () => {
    const http = kickServer(channels, users)

    const lives = await KickBusiness.getChannels('kick-token', ['alpha', 'beta', 'unknown'])

    expect(lives.streams).toEqual([
      expect.objectContaining({ type: 'kick', status: 'stream', id: '1', login: 'alpha', name: 'Alpha' }),
      expect.objectContaining({ type: 'kick', status: 'stream', id: '2', login: 'beta', name: 'Beta' }),
    ])
    expect(lives.streams[0].profileImage).toBe('https://files.kick.com/alpha.webp')
    expect(lives.onlines).toHaveLength(1)
    expect(lives.onlines[0]).toEqual(
      expect.objectContaining({
        type: 'kick',
        status: 'online',
        id: '1',
        login: 'alpha',
        title: 'alpha title',
        viewerCount: 120,
        game: 'Just Chatting',
      })
    )
    expect(lives.onlines[0].gameId).toBeUndefined()
    const preview = lives.onlines[0].previewImage as (width: number, height: number, dump?: string) => string
    expect(preview(320, 180, '7')).toBe('https://images.kick.com/alpha.webp?dump=7')

    const channelRequest = http.requests.find((value) => value.url.endsWith('/channels'))
    expect(channelRequest?.headers.Authorization).toBe('Bearer kick-token')
  })

  it('does not call the API without slugs', async () => {
    const http = kickServer(channels, users)

    expect(await KickBusiness.getChannels('kick-token', [])).toEqual({ streams: [], onlines: [] })
    expect(http.requests).toHaveLength(0)
  })

  it('reads the slugs added by the user', async () => {
    kickServer(channels, users)
    await browser.storage.sync.set({ [STORAGE_KEY_KICK_CHANNELS]: ['beta'] })

    const streams = await KickBusiness.getStreamersFollowed('kick-token')

    expect(streams.map((value) => value.login)).toEqual(['beta'])
    await browser.storage.sync.remove(STORAGE_KEY_KICK_CHANNELS)
  })

  it('finds a channel by slug, undefined when it does not exist', async () => {
    kickServer(channels, users)

    expect(await KickBusiness.getChannelBySlug('kick-token', 'beta')).toEqual(
      expect.objectContaining({ id: '2', login: 'beta' })
    )
    expect(await KickBusiness.getChannelBySlug('kick-token', 'unknown')).toBeUndefined()
  })

  it('gets the token user with the slug of its channel', async () => {
    kickServer(channels, users)

    expect(await KickBusiness.getSelfUser('kick-token')).toEqual({
      type: 'kick',
      id: '1',
      name: 'Alpha',
      login: 'alpha',
      avatarUrl: 'https://files.kick.com/alpha.webp',
    })
  })
})
