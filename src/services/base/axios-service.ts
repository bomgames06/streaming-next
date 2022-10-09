import { Axios } from 'axios';

export default class AxiosService {
  public readonly axios: Axios;

  constructor(uri: string) {
    this.axios = new Axios({
      baseURL: uri,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      validateStatus: this.validateStatus,
    });
  }

  private validateStatus(status: number): boolean {
    return status < 400;
  }
}
