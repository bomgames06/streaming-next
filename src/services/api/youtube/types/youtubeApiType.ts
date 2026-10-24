export type YoutubeApiBaseListType<T> = {
  items: T[]
  nextPageToken?: string
}

export type YoutubeApiThumbnailType = {
  url: string
  width?: number
  height?: number
}
export type YoutubeApiThumbnailsType = {
  default?: YoutubeApiThumbnailType
  medium?: YoutubeApiThumbnailType
  high?: YoutubeApiThumbnailType
}

export type YoutubeApiChannelType = {
  id: string
  snippet: {
    title: string
    customUrl?: string
    thumbnails: YoutubeApiThumbnailsType
  }
}

export type YoutubeApiSubscriptionType = {
  id: string
  snippet: {
    title: string
    resourceId: {
      kind: string
      channelId: string
    }
    thumbnails: YoutubeApiThumbnailsType
  }
}

export type YoutubeApiLiveBroadcastContentType = 'live' | 'upcoming' | 'none'
export type YoutubeApiVideoType = {
  id: string
  snippet: {
    channelId: string
    channelTitle: string
    title: string
    publishedAt: string
    thumbnails: YoutubeApiThumbnailsType
    liveBroadcastContent: YoutubeApiLiveBroadcastContentType
  }
  liveStreamingDetails?: {
    actualStartTime?: string
    actualEndTime?: string
    scheduledStartTime?: string
    concurrentViewers?: string
  }
}

export type YoutubeFeedEntryType = {
  videoId: string
  channelId: string
  published: string
}

export type YoutubeOAuthTokenInfoType = {
  // Google account id
  sub?: string
  expires_in?: string
}
