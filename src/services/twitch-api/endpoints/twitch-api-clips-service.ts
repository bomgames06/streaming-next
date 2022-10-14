import AxiosTwitchApiService from '@/services/twitch-api/base/axios-twitch-api-service';
import PaginationType from '@/types/pagination-type';
import ClipsType from '@/types/clips-type';
import { Moment } from 'moment';

export default class TwitchApiClipsService extends AxiosTwitchApiService {
  async getClips(userId: string, startedAt?: Moment, page?: string, accessToken?: string)
    : Promise<PaginationType<ClipsType>> {
    const response = await this.axios.get('/clips', {
      params: {
        broadcaster_id: userId,
        after: page || '',
        started_at: startedAt && startedAt.format(),
      },
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return {
      data: obj.data.map((item: any) => {
        const value: ClipsType = {
          id: item.id,
          online: true,
          login: item.broadcaster_id,
          nickname: item.broadcaster_name,
          title: item.title,
          viewers: item.view_count,
          createdAt: item.created_at,
          language: item.language,
          url: item.url,
          thumbnailUrl: item.thumbnail_url,
          duration: item.duration,
        };
        return value;
      }),
      pagination: obj.pagination,
    };
  }
}
