import AxiosTwitchApiService from '@/services/twitch-api/base/axios-twitch-api-service';
import VideosType from '@/types/videos-type';
import PaginationType from '@/types/pagination-type';
import FilterOrderVodType from '@/types/filter-order-vod-type';

export default class TwitchApiVideosService extends AxiosTwitchApiService {
  async getVideos(userId: string, sort?: FilterOrderVodType, page?: string, accessToken?: string)
    : Promise<PaginationType<VideosType>> {
    const response = await this.axios.get('/videos', {
      params: {
        user_id: userId,
        after: page || '',
        type: 'archive',
        sort: sort || '',
      },
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return {
      data: obj.data.map((item: any) => {
        const value: VideosType = {
          id: item.id,
          online: !!item.stream_id,
          login: item.user_login,
          nickname: item.user_name,
          title: item.title,
          viewers: item.view_count,
          createdAt: item.created_at,
          language: item.language,
          url: item.url,
          thumbnailUrl: item.thumbnail_url,
          duration: item.duration,
          mutedSegments: !item.muted_segments ? [] : item.muted_segments.map((itemMuted: any) => ({
            duration: itemMuted.duration,
            offset: itemMuted.offset,
          })),
        };
        return value;
      }),
      pagination: obj.pagination,
    };
  }
}
