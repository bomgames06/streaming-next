export type KickApiBaseType<T> = {
  data: T
  message: string
}

export type KickApiCategoryType = {
  id: number
  name: string
  thumbnail?: string
}
export type KickApiChannelStreamType = {
  is_live: boolean
  is_mature: boolean
  language: string
  // Empty while offline
  start_time: string
  thumbnail: string
  viewer_count: number
}
export type KickApiChannelType = {
  broadcaster_user_id: number
  slug: string
  stream_title: string
  channel_description?: string
  banner_picture?: string
  category?: KickApiCategoryType
  stream?: KickApiChannelStreamType
}
export type KickApiUserType = {
  user_id: number
  name: string
  profile_picture?: string
}
