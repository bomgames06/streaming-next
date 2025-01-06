export type TwitchApiBaseSingleType<T> = {
  data: T
}

export type TwitchApiBaseArrayType<T> = {
  data: T[]
  pagination: {
    cursor: string
  }
}

export type TwitchApiBasePaginationRequestType = {
  first?: string
  after?: string
  before?: string
}

export type TwitchApiBroadcasterType = 'affiliate' | 'partner' | ''

export type TwitchApiUserType = {
  id: string
  login: string
  display_name: string
  type: 'admin' | 'global_mod' | 'staff' | ''
  broadcaster_type: TwitchApiBroadcasterType
  description: string
  profile_image_url: string
  offline_image_url: string
  view_count: number
  email: string
  created_at: string
}

export type TwitchApiChannelFollowedType = {
  broadcaster_id: string
  broadcaster_login: string
  broadcaster_name: string
  followed_at: string
}

export type TwitchApiStreamsRequestType = {
  user_id?: string[]
  user_login?: string[]
  game_id?: string[]
  type?: 'all' | 'live'
  language?: string[]
} & TwitchApiBasePaginationRequestType
export type TwitchApiStreamsFollowedType = {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  type: string
  title: string
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
  tag_ids: string[]
  tags: string[]
  is_mature: boolean
}

export type TwitchApiVideoSegmentType = {
  duration: number
  offset: number
}
export type TwitchApiVideoType = {
  id: string
  stream_id: string
  user_id: string
  user_login: string
  user_name: string
  title: string
  description: string
  created_at: string
  published_at: string
  url: string
  thumbnail_url: string
  viewable: string
  view_count: number
  language: string
  type: string
  duration: string
  muted_segment: TwitchApiVideoSegmentType[]
}
export type TwitchApiVideoRequestType = {
  language?: string
  period?: 'all' | 'day' | 'month' | 'week'
  sort?: 'time' | 'trending' | 'views'
  type?: 'all' | 'archive' | 'highlight' | 'upload'
} & TwitchApiBasePaginationRequestType &
  (
    | { id: string[]; user_id?: string[]; game_id?: string[] }
    | { id?: string[]; user_id: string[]; game_id?: string[] }
    | { id?: string[]; user_id?: string[]; game_id: string[] }
  )
export type TwitchApiClipType = {
  id: string
  url: string
  embed_url: string
  broadcaster_id: string
  broadcaster_name: string
  creator_id: string
  creator_name: string
  video_id: string
  game_id: string
  language: string
  title: string
  view_count: number
  created_at: string
  thumbnail_url: string
  duration: number
  vod_offset: number
  is_featured: boolean
}
export type TwitchApiClipRequestType = {
  started_at?: Date
  ended_at?: Date
  is_featured?: boolean
} & TwitchApiBasePaginationRequestType &
  (
    | { id: string[]; broadcaster_id?: string[]; game_id?: string[] }
    | { id?: string[]; broadcaster_id: string[]; game_id?: string[] }
    | { id?: string[]; broadcaster_id?: string[]; game_id: string[] }
  )

export type TwitchApiGameType = {
  id: string
  name: string
  box_art_url: string
  igdb_id: string
}

export type TwitchApiGameTopRequestType = TwitchApiBasePaginationRequestType
export type TwitchApiGamesRequestType =
  | { id: string[]; name?: string[]; igdb_id?: string[] }
  | { id?: string[]; name: string[]; igdb_id?: string[] }
  | { id?: string[]; name?: string[]; igdb_id: string[] }

export type TwitchApiSearchChannelType = {
  broadcaster_language: string
  broadcaster_login: string
  display_name: string
  game_id: string
  game_name: string
  id: string
  is_live: boolean
  tag_ids: string[]
  tags: string[]
  thumbnail_url: string
  title: string
  started_at: string
}
export type TwitchApiSearchCategoryType = {
  id: string
  name: string
  box_art_url: string
}
export type TwitchApiSearchChannelRequestType = {
  query: string
  live_only?: boolean
} & TwitchApiBasePaginationRequestType
export type TwitchApiSearchCategoryRequestType = {
  query: string
} & Omit<TwitchApiBasePaginationRequestType, 'before'>
