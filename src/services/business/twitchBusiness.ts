import TwitchApi from '@/services/api/twitch/twitchApi'
import type { User } from '@/types/userType'
import type { AuthBackgroundMessageType, RevokeBackgroundMessageType } from '@/background/types/backgroundMessageType'
import browser from 'webextension-polyfill'
import type {
  StreamItemClipType,
  StreamItemLiveOfflineType,
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
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
import type {
  TwitchApiBroadcasterType,
  TwitchApiGameType,
  TwitchApiStreamsFollowedType,
  TwitchApiUserType,
} from '@/services/api/twitch/types/twitchApiType'
import useSystemStore from '@/store/system/useSystemStore'
import type { CategorySearchItem } from '@/components/listStream/types/streamItemType'

function isStreamVerified(value?: TwitchApiBroadcasterType): value is 'partner' {
  return value === 'partner'
}

function twitchStreamToStreamOnline(
  value: TwitchApiStreamsFollowedType & { user?: TwitchApiUserType }
): StreamItemLiveOnlineType {
  return {
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
    verified: isStreamVerified(value.user?.broadcaster_type),
  }
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
      token,
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
  async getStreamersOnlineFollowed(
    token: string,
    userId: string,
    noFetchUser?: boolean
  ): Promise<StreamItemLiveOnlineType[]> {
    const response = await TwitchApi.streams.followed(token, userId)

    const streamersIds = !noFetchUser ? response.map((value) => value.user_id) : []
    const users = !streamersIds.length ? [] : await TwitchApi.users.usersByIds(token, streamersIds)

    return response
      .map((value) => ({
        ...value,
        user: users.find((user) => user.id === value.user_id),
      }))
      .map(twitchStreamToStreamOnline)
  },
  async getStreamersFollowed(token: string, userId: string): Promise<StreamItemLiveStreamType[]> {
    const channelFollowed = await TwitchApi.channels.followed(token, userId)
    const streamersIds = channelFollowed.map((value) => value.broadcaster_id)
    const users = !streamersIds.length ? [] : await TwitchApi.users.usersByIds(token, streamersIds)

    const streamers: StreamItemLiveStreamType[] = users.map((value) => ({
      type: 'twitch',
      status: 'stream',
      id: value.id,
      login: value.login,
      name: value.display_name,
      profileImage: value.profile_image_url,
      verified: isStreamVerified(value.broadcaster_type),
    }))

    const system = useSystemStore()
    system.setAccountCacheStreams('twitch', streamers)

    return streamers
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
      language,
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map(twitchStreamToStreamOnline),
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

    const streamersIds = response.data.map((value) => value.id)
    const users = !streamersIds.length ? [] : await TwitchApi.users.usersByIds(token, streamersIds)

    return {
      cursor: response.pagination.cursor,
      items: response.data
        .map((value) => ({
          ...value,
          user: users.find((user) => user.id === value.id),
        }))
        .map((value) =>
          value.is_live
            ? ({
                type: 'twitch',
                status: 'online',
                id: value.id,
                login: value.broadcaster_login,
                name: value.display_name,
                title: value.title,
                gameId: value.game_id,
                game: value.game_name,
                startedAt: moment(value.started_at),
                previewImage: value.thumbnail_url,
                verified: isStreamVerified(value.user?.broadcaster_type),
              } as StreamItemLiveOnlineType)
            : ({
                type: 'twitch',
                status: 'offline',
                id: value.id,
                login: value.broadcaster_login,
                name: value.display_name,
                profileImage: value.thumbnail_url,
                verified: isStreamVerified(value.user?.broadcaster_type),
              } as StreamItemLiveOfflineType)
        ),
    }
  },
  async searchCategories(
    token: string,
    query: string,
    cursor?: string,
    limit?: number
  ): Promise<{ items: CategorySearchItem[]; cursor?: string }> {
    const response = await TwitchApi.search.categories(token, {
      query,
      first: limit?.toString(),
      after: cursor,
    })

    return {
      cursor: response.pagination.cursor,
      items: response.data.map((item) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.box_art_url,
      })),
    }
  },
}

export default TwitchBusiness
