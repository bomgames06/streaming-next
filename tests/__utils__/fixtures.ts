import moment from 'moment'
import type { AccountStore } from '@/store/system/types/systemStoreType'
import type {
  StreamItemClipType,
  StreamItemLiveOfflineType,
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemVideoType,
} from '@/components/listStream/types/streamItemType'
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
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'

export function account(override?: Partial<AccountStore>): AccountStore {
  return {
    id: 'uuid',
    type: 'twitch',
    accountId: 'me-id',
    name: 'Me',
    login: 'me',
    avatarUrl: 'https://cdn/me.png',
    token: 'token',
    invalid: false,
    ...override,
  }
}

export function onlineItem(override?: Partial<StreamItemLiveOnlineType>): StreamItemLiveOnlineType {
  return {
    type: 'twitch',
    status: 'online',
    id: '1',
    login: 'alpha',
    name: 'Alpha',
    title: 'Alpha title',
    viewerCount: 10,
    gameId: 'game-1',
    game: 'Minecraft',
    startedAt: moment().subtract(1, 'hours'),
    previewImage: (width, height, dump) => `https://preview/alpha-${width}x${height}${dump ? `&dump=${dump}` : ''}`,
    verified: false,
    ...override,
  }
}
export function streamItem(override?: Partial<StreamItemLiveStreamType>): StreamItemLiveStreamType {
  return {
    type: 'twitch',
    status: 'stream',
    id: '1',
    login: 'alpha',
    name: 'Alpha',
    profileImage: 'https://profile/alpha.png',
    verified: false,
    ...override,
  }
}
export function offlineItem(override?: Partial<StreamItemLiveOfflineType>): StreamItemLiveOfflineType {
  return {
    type: 'twitch',
    status: 'offline',
    id: '1',
    login: 'alpha',
    name: 'Alpha',
    profileImage: 'https://profile/alpha.png',
    verified: false,
    ...override,
  }
}
export function videoItem(override?: Partial<StreamItemVideoType>): StreamItemVideoType {
  return {
    type: 'twitch',
    status: 'video',
    id: 'v1',
    login: 'alpha',
    name: 'Alpha',
    title: 'Video title',
    url: 'https://twitch.tv/videos/v1',
    viewerCount: 1500,
    duration: 3723,
    createdAt: moment().subtract(2, 'days'),
    previewImage: (width, height) => `https://preview/video-${width}x${height}`,
    ...override,
  }
}
export function clipItem(override?: Partial<StreamItemClipType>): StreamItemClipType {
  return {
    type: 'twitch',
    status: 'clip',
    id: 'c1',
    login: 'Alpha',
    name: 'Alpha',
    title: 'Clip title',
    url: 'https://clips.twitch.tv/c1',
    viewerCount: 20,
    duration: 29.6,
    createdAt: moment().subtract(3, 'hours'),
    previewImage: 'https://preview/clip.jpg',
    ...override,
  }
}
export function categoryItem(override?: Partial<CategoryItemType>): CategoryItemType {
  return {
    type: 'twitch',
    id: 'game-1',
    name: 'Minecraft',
    boxArtUrl: 'https://box/minecraft-{width}x{height}.jpg',
    igdbId: 'igdb-1',
    ...override,
  }
}

// Twitch API payloads
export function apiUser(override?: Partial<TwitchApiUserType>): TwitchApiUserType {
  return {
    id: 'me-id',
    login: 'me',
    display_name: 'Me',
    type: '',
    broadcaster_type: '',
    description: '',
    profile_image_url: 'https://cdn/me.png',
    offline_image_url: '',
    view_count: 0,
    email: 'me@example.com',
    created_at: '2020-01-01T00:00:00Z',
    ...override,
  }
}
export function apiStream(override?: Partial<TwitchApiStreamsFollowedType>): TwitchApiStreamsFollowedType {
  return {
    id: 's1',
    user_id: '1',
    user_login: 'alpha',
    user_name: 'Alpha',
    game_id: 'game-1',
    game_name: 'Minecraft',
    type: 'live',
    title: 'Alpha title',
    viewer_count: 10,
    started_at: '2026-10-23T10:00:00Z',
    language: 'en',
    thumbnail_url: 'https://preview/alpha-{width}x{height}.jpg',
    tag_ids: [],
    tags: [],
    is_mature: false,
    ...override,
  }
}
export function apiFollowed(override?: Partial<TwitchApiChannelFollowedType>): TwitchApiChannelFollowedType {
  return {
    broadcaster_id: '1',
    broadcaster_login: 'alpha',
    broadcaster_name: 'Alpha',
    followed_at: '2020-01-01T00:00:00Z',
    ...override,
  }
}
export function apiVideo(override?: Partial<TwitchApiVideoType>): TwitchApiVideoType {
  return {
    id: 'v1',
    stream_id: 's1',
    user_id: '1',
    user_login: 'alpha',
    user_name: 'Alpha',
    title: 'Video title',
    description: '',
    created_at: '2026-10-20T10:00:00Z',
    published_at: '2026-10-20T10:00:00Z',
    url: 'https://twitch.tv/videos/v1',
    thumbnail_url: 'https://preview/video-%{width}x%{height}.jpg',
    viewable: 'public',
    view_count: 1500,
    language: 'en',
    type: 'archive',
    duration: '1h2m3s',
    muted_segment: [],
    ...override,
  }
}
export function apiClip(override?: Partial<TwitchApiClipType>): TwitchApiClipType {
  return {
    id: 'c1',
    url: 'https://clips.twitch.tv/c1',
    embed_url: '',
    broadcaster_id: '1',
    broadcaster_name: 'Alpha',
    creator_id: '2',
    creator_name: 'Bravo',
    video_id: '',
    game_id: 'game-1',
    language: 'en',
    title: 'Clip title',
    view_count: 20,
    created_at: '2026-10-23T08:00:00Z',
    thumbnail_url: 'https://preview/clip.jpg',
    duration: 29.6,
    vod_offset: 0,
    is_featured: false,
    ...override,
  }
}
export function apiGame(override?: Partial<TwitchApiGameType>): TwitchApiGameType {
  return {
    id: 'game-1',
    name: 'Minecraft',
    box_art_url: 'https://box/minecraft-{width}x{height}.jpg',
    igdb_id: 'igdb-1',
    ...override,
  }
}
export function apiSearchChannel(override?: Partial<TwitchApiSearchChannelType>): TwitchApiSearchChannelType {
  return {
    broadcaster_language: 'en',
    broadcaster_login: 'alpha',
    display_name: 'Alpha',
    game_id: 'game-1',
    game_name: 'Minecraft',
    id: '1',
    is_live: true,
    tag_ids: [],
    tags: [],
    thumbnail_url: 'https://preview/alpha.jpg',
    title: 'Alpha title',
    started_at: '2026-10-23T10:00:00Z',
    ...override,
  }
}
export function apiSearchCategory(override?: Partial<TwitchApiSearchCategoryType>): TwitchApiSearchCategoryType {
  return {
    id: 'game-1',
    name: 'Minecraft',
    box_art_url: 'https://box/minecraft-52x72.jpg',
    ...override,
  }
}
