import YoutubeApiChannelsEndpoint from '@/services/api/youtube/endpoints/youtubeApiChannelsEndpoint.ts'
import YoutubeApiSubscriptionsEndpoint from '@/services/api/youtube/endpoints/youtubeApiSubscriptionsEndpoint.ts'

const YoutubeApi = {
  channels: new YoutubeApiChannelsEndpoint(),
  subscriptions: new YoutubeApiSubscriptionsEndpoint(),
}

export default YoutubeApi
