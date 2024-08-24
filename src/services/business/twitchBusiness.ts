import TwitchApi from '@/services/api/twitch/twitchApi'
import type { User } from '@/types/userType'
import type { AuthBackgroundMessageType, RevokeBackgroundMessageType } from '@/background/types/backgroundMessageType'
import browser from 'webextension-polyfill'
import type {
  StreamItemClipType,
  StreamItemLiveOfflineType,
  StreamItemLiveOnlineType,
  StreamItemLiveType,
  StreamItemVideoType,
} from '@/components/listStream/types/streamItemType'
import moment from 'moment'
import { getTimeByClipPeriod, twitchDurationToSeconds } from '@/utils/util'
import type {
  ClipPeriodStore,
  LanguageCategoryStreamStore,
  VideoOrderStore,
} from '@/store/system/types/systemStoreType'
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'
import type { TwitchApiGameType, TwitchApiStreamsFollowedType } from '@/services/api/twitch/types/twitchApiType'
import useSystemStore from '@/store/system/useSystemStore'

function twitchStreamToStreamOnline(): (value: TwitchApiStreamsFollowedType) => StreamItemLiveOnlineType {
  return (value) => ({
    type: 'twitch',
    status: 'online',
    id: value.user_id,
    login: value.user_login,
    name: value.user_name,
    title: value.title,
    gameId: value.game_id,
    game: value.game_name,
    viewerCount: value.viewer_count,
    startedAt: moment(value.started_at),
    previewImage: (width, height, dump) => {
      let image = value.thumbnail_url.replace('{width}', width.toFixed()).replace('{height}', height.toFixed())
      if (dump) image += `&dump=${dump}`
      return image
    },
  })
}
function twitchGameToCategoryItem(): (value: TwitchApiGameType) => CategoryItemType {
  return (value) => ({
    type: 'twitch',
    id: value.id,
    name: value.name,
    boxArtUrl: value.box_art_url,
    igdbId: value.igdb_id,
  })
}

const TwitchBusiness = {
  async auth(forceVerify?: boolean, interactive?: boolean): Promise<{ token: string; user: User }> {
    const message: AuthBackgroundMessageType = {
      type: 'auth',
      authType: 'twitch',
      forceVerify,
      interactive,
    }
    const accessToken: string = await browser.runtime.sendMessage(message)
    const user = await this.getSelfUser(accessToken)

    return { token: accessToken, user }
  },
  async revoke(token: string) {
    const message: RevokeBackgroundMessageType = {
      type: 'revoke',
      authType: 'twitch',
      token: token,
    }
    await browser.runtime.sendMessage(message)
  },
  async getSelfUser(token: string): Promise<User> {
    const response = await TwitchApi.users.self(token)

    return {
      type: 'twitch',
      id: response.id,
      name: response.display_name,
      login: response.login,
      avatarUrl: response.profile_image_url,
    }
  },
  async getStreamersOnlineFollowed(token: string, userId: string): Promise<StreamItemLiveOnlineType[]> {
    const response = await TwitchApi.streams.followed(token, userId)

    return response.map(twitchStreamToStreamOnline())
  },
  async getStreamersOfflineFollowed(
    token: string,
    userId: string,
    excludeIds?: string[]
  ): Promise<StreamItemLiveOfflineType[]> {
    const excludes: string[] =
      excludeIds ?? (await this.getStreamersOnlineFollowed(token, userId)).map((value) => value.id)

    const channelFollowed = await TwitchApi.channels.followed(token, userId)
    const streamersOfflineIds = !excludes ? [] : channelFollowed.map((value) => value.broadcaster_id)
    const usersOffline = !streamersOfflineIds.length ? [] : await TwitchApi.users.usersByIds(token, streamersOfflineIds)

    const streamersOffline: StreamItemLiveOfflineType[] = usersOffline.map((value) => ({
      type: 'twitch',
      status: 'offline',
      id: value.id,
      login: value.login,
      name: value.display_name,
      profileImage: value.profile_image_url,
    }))

    const system = useSystemStore()
    system.setAccountCacheStreams('twitch', streamersOffline)

    return streamersOffline.filter((value) => !excludes.some((id) => id === value.id))
  },
  async getUsersByIds(token: string, ids: string[]): Promise<User[]> {
    const response = await TwitchApi.users.usersByIds(token, ids)

    return response.map((value) => ({
      type: 'twitch',
      id: value.id,
      name: value.display_name,
      login: value.login,
      avatarUrl: value.profile_image_url,
    }))
  },
  async getUserVideosArchive(
    token: string,
    userId: string,
    videoOrder?: VideoOrderStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemVideoType[]; cursor?: string }> {
    const response = await TwitchApi.videos.videos(token, {
      user_id: [userId],
      type: 'archive',
      sort: videoOrder,
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map((value) => ({
        type: 'twitch',
        id: value.id,
        status: 'video',
        name: value.user_name,
        login: value.user_login,
        title: value.title,
        url: value.url,
        viewerCount: value.view_count,
        duration: twitchDurationToSeconds(value.duration),
        createdAt: moment(value.created_at),
        previewImage: (width, height, dump) => {
          if (value.thumbnail_url.startsWith('https://vod-secure.twitch.tv/_404')) return ''
          let image = value.thumbnail_url.replace('%{width}', width.toFixed()).replace('%{height}', height.toFixed())
          if (dump) image += `&dump=${dump}`
          return image
        },
      })),
    }
  },
  async getUserClips(
    token: string,
    userId: string,
    period?: ClipPeriodStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemClipType[]; cursor?: string }> {
    const startedAt = getTimeByClipPeriod(period)
    const response = await TwitchApi.clips.clips(token, {
      broadcaster_id: [userId],
      started_at: startedAt && startedAt.toDate(),
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map((value) => ({
        type: 'twitch',
        id: value.id,
        status: 'clip',
        name: value.broadcaster_name,
        login: value.broadcaster_name,
        title: value.title,
        url: value.url,
        viewerCount: value.view_count,
        duration: value.duration,
        createdAt: moment(value.created_at),
        previewImage: value.thumbnail_url,
      })),
    }
  },
  async getTopGamesCategory(
    token: string,
    cursor?: string,
    limit?: number
  ): Promise<{ items: CategoryItemType[]; cursor?: string }> {
    const response = await TwitchApi.games.top(token, {
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map(twitchGameToCategoryItem()),
    }
  },
  async getStreamsByCategory(
    token: string,
    categoryId: string,
    language?: LanguageCategoryStreamStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemLiveOnlineType[]; cursor?: string }> {
    const response = await TwitchApi.streams.stream(token, {
      game_id: [categoryId],
      language: language,
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map(twitchStreamToStreamOnline()),
    }
  },
  async getCategoryById(token: string, categoryId: string): Promise<CategoryItemType[]> {
    const response = await TwitchApi.games.games(token, {
      id: [categoryId],
    })

    return response.map(twitchGameToCategoryItem())
  },
  async searchChannels(
    token: string,
    query: string,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemLiveType[]; cursor?: string }> {
    const response = await TwitchApi.search.channels(token, {
      query,
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map((value) =>
        value.is_live
          ? {
              type: 'twitch',
              status: 'online',
              id: value.id,
              login: value.broadcaster_login,
              name: value.display_name,
              title: value.title,
              gameId: value.game_id,
              game: value.game_name,
              startedAt: moment(value.started_at),
              profileImage: value.thumbnail_url,
            }
          : {
              type: 'twitch',
              status: 'offline',
              id: value.id,
              login: value.broadcaster_login,
              name: value.display_name,
              profileImage: value.thumbnail_url,
            }
      ),
    }
  },
}

export default TwitchBusiness
