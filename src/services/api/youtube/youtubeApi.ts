import YoutubeApiChannelEndpoint from '@/services/api/youtube/endpoints/youtubeApiChannelEndpoint'
import YoutubeApiSubscriptionEndpoint from '@/services/api/youtube/endpoints/youtubeApiSubscriptionEndpoint'
import YoutubeApiVideoEndpoint from '@/services/api/youtube/endpoints/youtubeApiVideoEndpoint'
import YoutubeFeedEndpoint from '@/services/api/youtube/endpoints/youtubeFeedEndpoint'
import YoutubeOAuthTokenInfoEndpoint from '@/services/api/youtube/endpoints/youtubeOAuthTokenInfoEndpoint'

const YoutubeApi = {
  channels: new YoutubeApiChannelEndpoint(),
  subscriptions: new YoutubeApiSubscriptionEndpoint(),
  videos: new YoutubeApiVideoEndpoint(),
  feeds: new YoutubeFeedEndpoint(),
  oauth: new YoutubeOAuthTokenInfoEndpoint(),
}

export default YoutubeApi
