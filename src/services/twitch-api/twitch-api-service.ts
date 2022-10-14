import TwitchApiUsersService from '@/services/twitch-api/endpoints/twitch-api-users-service';
import TwitchApiStreamersService
  from '@/services/twitch-api/endpoints/twitch-api-streamers-service';
import TwitchApiSearchService from '@/services/twitch-api/endpoints/twitch-api-search-service';
import TwitchApiGamesService from '@/services/twitch-api/endpoints/twitch-api-games-service';
import TwitchApiVideosService from '@/services/twitch-api/endpoints/twitch-api-videos-service';
import TwitchApiClipsService from '@/services/twitch-api/endpoints/twitch-api-clips-service';

export default class TwitchApiService {
  static users: TwitchApiUsersService = new TwitchApiUsersService(this);

  static streamers: TwitchApiStreamersService = new TwitchApiStreamersService(this);

  static search: TwitchApiSearchService = new TwitchApiSearchService(this);

  static games: TwitchApiGamesService = new TwitchApiGamesService(this);

  static videos: TwitchApiVideosService = new TwitchApiVideosService(this);

  static clips: TwitchApiClipsService = new TwitchApiClipsService(this);
}
