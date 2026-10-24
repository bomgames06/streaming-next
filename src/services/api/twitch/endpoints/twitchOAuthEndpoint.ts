import AxiosBase from '@/services/base/axiosBase'

// Twitch OAuth server, its errors don't go to the API error handlers (a 401 here is the answer, not a failure)
export default class TwitchOAuthEndpoint extends AxiosBase {
  constructor() {
    super(import.meta.env.VITE_APP_OAUTH2_TWITCH_URL)
  }

  /** Answers 401 when the token is no longer valid */
  async validate(token: string): Promise<void> {
    await this.axios().get('/validate', { headers: { Authorization: `OAuth ${token}` } })
  }
}
