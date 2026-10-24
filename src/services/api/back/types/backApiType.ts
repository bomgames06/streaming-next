export type BackTokenType = {
  accessToken: string
  // Seconds
  expiresIn: number
  // On the login, and on the refresh when the provider rotates it (Twitch may)
  refreshToken?: string
}
