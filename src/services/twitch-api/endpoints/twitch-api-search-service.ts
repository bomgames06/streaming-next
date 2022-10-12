import AxiosTwitchApiService from '@/services/twitch-api/base/axios-twitch-api-service';
import CategoryType from '@/types/category-type';
import ChannelType from '@/types/channel-type';

export default class TwitchApiSearchService extends AxiosTwitchApiService {
  async searchCategory(query: string, page?: string, accessToken?: string)
    : Promise<CategoryType[]> {
    const response = await this.axios.get('/search/categories', {
      params: {
        query,
        after: page || '',
        first: 100,
      },
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return obj.data.map((item: any) => {
      const value: CategoryType = {
        id: item.id,
        name: item.name,
        boxArtUrl: item.box_art_url,
      };
      return value;
    });
  }

  async searchChannels(query: string, page?: string, accessToken?: string)
    : Promise<ChannelType[]> {
    const response = await this.axios.get('/search/channels', {
      params: {
        query,
        after: page || '',
        first: 100,
      },
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return obj.data.map((item: any) => {
      const value: ChannelType = {
        id: item.id,
        online: !!item.is_live,
        login: item.broadcaster_login,
        nickname: item.display_name,
        gameId: item.game_id,
        gameName: item.game_name,
        title: item.title,
        startedAt: item.started_at,
        language: item.broadcaster_language,
        thumbnailUrl: item.thumbnail_url,
        tagIds: item.tags_ids,
      };
      return value;
    });
  }
}
