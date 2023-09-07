import AxiosTwitchApiService from '@/services/twitch-api/base/axios-twitch-api-service';
import UserType from '@/types/user-type';
import { partition } from '@/utils/utils';

export default class TwitchApiUsersService extends AxiosTwitchApiService {
  async getSelfUser(accessToken?: string): Promise<UserType> {
    const response = await this.axios.get('/users', {
      headers: {
        'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const obj = JSON.parse(response.data);

    return {
      id: obj.data[0].id,
      login: obj.data[0].login,
      nickname: obj.data[0].display_name,
      avatar: obj.data[0].profile_image_url,
    };
  }

  async getFollowFromUser(userId: string, accessToken?: string): Promise<UserType[]> {
    return AxiosTwitchApiService.fetchAll(async (page) => {
      // TODO: hotfix, change to other endpoint class
      const response = await this.axios.get('/channels/followers', {
        params: {
          broadcaster_id: userId,
          after: page || '',
          first: 100,
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
          const item: UserType = {
            id: value.user_id,
            login: value.user_login,
            nickname: value.user_name,
          };
          return item;
        }),
      };
    });
  }

  async getUsers(userIds: string[], accessToken?: string): Promise<UserType[]> {
    const paritionValues = partition(userIds, 100);
    const values: UserType[] = [];

    const promises: any[] = [];
    paritionValues.forEach((ids) => {
      promises.push((async (): Promise<UserType[]> => {
        const params = new URLSearchParams();
        ids.forEach((value) => params.append('id', value));

        const response = await this.axios.get('/users', {
          params,
          headers: {
            'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const obj = JSON.parse(response.data);

        return obj.data.map((value: any): UserType => ({
          id: value.id,
          login: value.login,
          nickname: value.display_name,
          avatar: value.profile_image_url,
        }));
      })());
    });

    const responses = await Promise.all(promises);
    responses.forEach((value) => values.push(...value));

    return values;
  }
}
