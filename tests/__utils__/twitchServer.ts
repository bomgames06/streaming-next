import { mockHttp, page } from '@tests/__utils__/http'
import type {
  TwitchApiChannelFollowedType,
  TwitchApiClipType,
  TwitchApiGameType,
  TwitchApiSearchCategoryType,
  TwitchApiSearchChannelType,
  TwitchApiStreamsFollowedType,
  TwitchApiUserType,
  TwitchApiVideoType,
} from '@/services/api/twitch/types/twitchApiType'
import { apiUser } from '@tests/__utils__/fixtures'

export type TwitchServerData = {
  me?: TwitchApiUserType
  users?: TwitchApiUserType[]
  followedStreams?: TwitchApiStreamsFollowedType[]
  followedChannels?: TwitchApiChannelFollowedType[]
  videos?: TwitchApiVideoType[]
  clips?: TwitchApiClipType[]
  topGames?: TwitchApiGameType[]
  games?: TwitchApiGameType[]
  categoryStreams?: TwitchApiStreamsFollowedType[]
  searchChannels?: TwitchApiSearchChannelType[]
  searchCategories?: TwitchApiSearchCategoryType[]
  // Cursor returned on the first page of the paginated lists
  cursor?: string
}

/**
 * In-memory Twitch Helix API on top of mockHttp. `/users` without ids answers the authenticated user,
 * with ids it answers the matching users like the real API.
 */
export function twitchServer(initial?: TwitchServerData) {
  const data: TwitchServerData = { me: apiUser(), ...initial }
  const firstPage = <T>(items: T[] | undefined, after: string | null) =>
    after ? page(items || []) : page(items || [], data.cursor)

  const http = mockHttp()
    .get('/users', (request) => {
      const ids = request.query.getAll('id')
      if (!ids.length) return { data: { data: [data.me] } }
      return { data: { data: (data.users || []).filter((user) => ids.includes(user.id)) } }
    })
    .get('/streams/followed', () => page(data.followedStreams || []))
    .get('/channels/followed', () => page(data.followedChannels || []))
    .get('/videos', (request) => firstPage(data.videos, request.query.get('after')))
    .get('/clips', (request) => firstPage(data.clips, request.query.get('after')))
    .get('/games/top', (request) => firstPage(data.topGames, request.query.get('after')))
    .get('/games', (request) => {
      const ids = request.query.getAll('id')
      const names = request.query.getAll('name').map((name) => name.toLowerCase())
      return page((data.games || []).filter((game) => ids.includes(game.id) || names.includes(game.name.toLowerCase())))
    })
    .get('/streams', (request) => firstPage(data.categoryStreams, request.query.get('after')))
    .get('/search/channels', (request) => firstPage(data.searchChannels, request.query.get('after')))
    .get('/search/categories', () => page(data.searchCategories || []))

  return { http, data }
}
