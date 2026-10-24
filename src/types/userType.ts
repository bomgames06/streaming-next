import type { AccountStoreType } from '@/store/system/types/systemStoreType'

export type User = {
  type: AccountStoreType
  id: string
  name: string
  login: string
  avatarUrl?: string
}

export type AuthenticatedType = {
  token: string
  user: User
  // Only for tokens that expire quickly (YouTube), renewed with the refresh token
  expiresAt?: number
  refreshToken?: string
}
