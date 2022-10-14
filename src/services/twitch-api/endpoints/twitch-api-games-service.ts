import AxiosTwitchApiService from '@/services/twitch-api/base/axios-twitch-api-service';
import CategoryType from '@/types/category-type';
import PaginationType from '@/types/pagination-type';

export default class TwitchApiGamesService extends AxiosTwitchApiService {
  async topGames(page?: string, first?: number, accessToken?: string)
    : Promise<PaginationType<CategoryType>> {
    const response = await this.axios.get('/games/top', {
      params: {
        after: page || '',
        first: first || '',
      },
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return {
      data: obj.data.map((item: any) => {
        const value: CategoryType = {
          id: item.id,
          name: item.name,
          boxArtUrl: item.box_art_url,
        };
        return value;
      }),
      pagination: obj.pagination,
    };
  }

  async getGame(id: string, page?: string, first?: number, accessToken?: string)
    : Promise<CategoryType | null> {
    const response = await this.axios.get('/games', {
      params: {
        id,
        after: page || '',
        first: first || '',
      },
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    const value = obj.data[0];
    if (!value) return null;

    return {
      id: value.id,
      name: value.name,
      boxArtUrl: value.box_art_url,
    };
  }
}
