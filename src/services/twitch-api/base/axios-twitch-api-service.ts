import AxiosService from '@/services/base/axios-service';

export default class AxiosTwitchApiService extends AxiosService {
  service: any;

  constructor(service: any) {
    super('https://api.twitch.tv/helix');
    this.service = service;
  }

  static async fetchAll<T>(handler: (page: string) => Promise<{ page: string, items: T[] }>)
    : Promise<T[]> {
    const list: T[] = [];
    let fetch: any;

    let page = null;
    do {
      fetch = await handler(page);
      page = fetch.page;
      list.push(...fetch.items);
    } while (page);

    return list;
  }
}
