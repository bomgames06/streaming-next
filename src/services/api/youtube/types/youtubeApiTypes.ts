export type YoutubeApiBaseArrayType<T> = {
  items: T[]
}
export type YoutubeApiBaseArrayPaginationType<T> = {
  kind: string
  etag: string
  nextPageToken?: string
  prevPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
} & YoutubeApiBaseArrayType<T>

export type YoutubeApiChannelsListRequest = {
  part: (
    | 'auditDetails'
    | 'brandingSettings'
    | 'contentDetails'
    | 'contentOwnerDetails'
    | 'id'
    | 'localizations'
    | 'snippet'
    | 'statistics'
    | 'status'
    | 'topicDetails'
  )[]
  mine?: boolean
}
export type YoutubeApiChannelsListResponse = {
  kind: 'youtube#channel'
  etag: string
  id: string
  snippet: {
    title: string
    description: string
    customUrl: string
    publishedAt: string
    thumbnails: {
      [key: string]: {
        url: string
        width: number
        height: number
      }
    }
    defaultLanguage: string
    localized: {
      title: string
      description: string
    }
    country: string
  }
  contentDetails: {
    relatedPlaylists: {
      likes: string
      favorites: string
      uploads: string
    }
  }
  statistics: {
    viewCount: number
    subscriberCount: number
    hiddenSubscriberCount: boolean
    videoCount: number
  }
  topicDetails: {
    topicIds: string[]
    topicCategories: string[]
  }
  status: {
    privacyStatus: string
    isLinked: boolean
    longUploadsStatus: string
    madeForKids: boolean
    selfDeclaredMadeForKids: boolean
  }
  brandingSettings: {
    channel: {
      title: string
      description: string
      keywords: string
      trackingAnalyticsAccountId: string
      unsubscribedTrailer: string
      defaultLanguage: string
      country: string
    }
    watch: {
      textColor: string
      backgroundColor: string
      featuredPlaylistId: string
    }
  }
  auditDetails: {
    overallGoodStanding: boolean
    communityGuidelinesGoodStanding: boolean
    copyrightStrikesGoodStanding: boolean
    contentIdClaimsGoodStanding: boolean
  }
  contentOwnerDetails: {
    contentOwner: string
    timeLinked: string
  }
  localizations: {
    [key: string]: {
      title: string
      description: string
    }
  }
}

export type YoutubeApiSubscriptionsListRequest = {
  part: ('contentDetails' | 'id' | 'snippet' | 'subscriberSnippet')[]
  mine?: boolean
  pageToken?: string
  maxResults?: number
}
export type YoutubeApiSubscriptionsListResponse = {
  kind: 'youtube#subscription'
  etag: string
  id: string
  snippet: {
    publishedAt: string
    channelTitle: string
    title: string
    description: string
    resourceId: {
      kind: string
      channelId: string
    }
    channelId: string
    thumbnails: {
      [key: string]: {
        url: string
        width: number
        height: number
      }
    }
  }
  contentDetails: {
    totalItemCount: number
    newItemCount: number
    activityType: string
  }
  subscriberSnippet: {
    title: string
    description: string
    channelId: string
    thumbnails: {
      [key: string]: {
        url: string
        width: number
        height: number
      }
    }
  }
}
