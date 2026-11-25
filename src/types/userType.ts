import type { AccountStoreType } from '@/store/system/types/systemStoreType'

export type User = {
  type: AccountStoreType
  id: string
  name: string
  login: string
  avatarUrl?: string
}

// Access token of the code flow, renewed with the refresh token through streaming-next-back
export type AccountTokenType = { token: string; expiresAt: number; refreshToken?: string }

export type AuthenticatedType = {
  token: string
  user: User
  // Without them for the Twitch accounts logged before the code flow
  expiresAt?: number
  refreshToken?: string
}
