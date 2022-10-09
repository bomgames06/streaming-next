import AxiosTwitchApiService from '@/services/twitch-api/base/axios-twitch-api-service';
import StreamersType from '@/types/streamers-type';
import UserType from '@/types/user-type';

export default class TwitchApiStreamersService extends AxiosTwitchApiService {
  async getStreamersOfflineFollowed(userId: string, excludeIds?: string[], accessToken?: string)
    : Promise<StreamersType[]> {
    const streamersFollow = await this.service.users.getFollowFromUser(userId, accessToken);
    const streamersOfflineIds = !excludeIds || !excludeIds.length ? []
      : streamersFollow.filter((follow: UserType) => !excludeIds
        .some((id) => id === follow.id))
        .map((follow: UserType) => follow.id);
    const streamersOffline = !streamersOfflineIds.length ? []
      : await this.service.users.getUsers(streamersOfflineIds, accessToken);

    return streamersOffline.map((value: UserType): StreamersType => ({
      id: value.id,
      online: false,
      login: value.login,
      nickname: value.nickname,
      profileImage: value.avatar,
    }));
  }

  async getStreamersOnlineFollowed(userId: string, accessToken?: string): Promise<StreamersType[]> {
    return AxiosTwitchApiService.fetchAll(async (page) => {
      const response = await this.axios.get('/streams/followed', {
        params: {
          user_id: userId,
          after: page || '',
        },
        headers: {
          'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const obj = JSON.parse(response.data);

      return {
        page: obj.pagination && obj.pagination.cursor,
        items: obj.data.map((value: any) => {
          const item: StreamersType = {
            id: value.user_id,
            online: true,
            login: value.user_login,
            nickname: value.user_name,
            gameId: value.game_id,
            gameName: value.game_name,
            type: value.type,
            title: value.title,
            viewers: value.viewer_count,
            startedAt: value.started_at,
            language: value.language,
            thumbnailUrl: value.thumbnail_url,
            tagIds: value.tag_ids,
            isMature: value.is_mature,
          };
          return item;
        }),
      };
    });
  }

  async getStreams(
    gameIds: string[],
    language?: string,
    nick?: string,
    page?: string,
    accessToken?: string,
  ): Promise<StreamersType[]> {
    const params = new URLSearchParams();
    gameIds.forEach((value) => params.append('game_id', value));
    params.set('after', page || '');
    if (language) {
      params.set('language', language);
    }
    if (nick) {
      params.set('user_login', nick);
    }
    params.set('first', '100');
    const response = await this.axios.get('/streams', {
      params,
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return obj.data.map((value: any) => {
      const item: StreamersType = {
        online: true,
        id: value.id,
        login: value.user_login,
        nickname: value.user_name,
        gameId: value.game_id,
        gameName: value.game_name,
        type: value.live,
        title: value.title,
        viewers: value.viewer_count,
        startedAt: value.started_at,
        language: value.language,
        thumbnailUrl: value.thumbnail_url,
        isMature: value.is_mature,
      };
      return item;
    });
  }
}
