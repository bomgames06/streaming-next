import TwitchApiUserEndpoint from '@/services/api/twitch/endpoints/twitchApiUserEndpoint'
import TwitchApiChannelEndpoint from '@/services/api/twitch/endpoints/twitchApiChannelEndpoint'
import TwitchApiStreamsEndpoint from '@/services/api/twitch/endpoints/twitchApiStreamsEndpoint'
import TwitchApiVideosEndpoint from '@/services/api/twitch/endpoints/twitchApiVideosEndpoint'
import TwitchApiClipsEndpoint from '@/services/api/twitch/endpoints/twitchApiClipsEndpoint'
import TwitchApiGamesEndpoint from '@/services/api/twitch/endpoints/twitchApiGamesEndpoint'
import TwitchApiSearchEndpoint from '@/services/api/twitch/endpoints/twitchApiSearchEndpoint'
import TwitchOAuthEndpoint from '@/services/api/twitch/endpoints/twitchOAuthEndpoint'

const TwitchApi = {
  users: new TwitchApiUserEndpoint(),
  channels: new TwitchApiChannelEndpoint(),
  streams: new TwitchApiStreamsEndpoint(),
  videos: new TwitchApiVideosEndpoint(),
  clips: new TwitchApiClipsEndpoint(),
  games: new TwitchApiGamesEndpoint(),
  search: new TwitchApiSearchEndpoint(),
  oauth: new TwitchOAuthEndpoint(),
}

export default TwitchApi
