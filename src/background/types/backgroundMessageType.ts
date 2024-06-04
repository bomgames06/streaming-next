import type { AccountStoreType } from '@/store/system/types/systemStoreType'

export type AuthBackgroundMessageType = {
  type: 'auth'
  authType: AccountStoreType
  forceVerify?: boolean
}
export type RevokeBackgroundMessageType = {
  type: 'revoke'
  authType: AccountStoreType
  token: string
}
export type InvalidateBadgeBackgroundMessageType = {
  type: 'invalidateBadge'
}
export type SetCountBadgeBackgroundMessageType = {
  type: 'setCountBadge'
  count: number
}
export type FetchStreamBackgroundMessageType = {
  type: 'fetchStream'
}
export type BackgroundMessageType =
  | AuthBackgroundMessageType
  | RevokeBackgroundMessageType
  | InvalidateBadgeBackgroundMessageType
  | SetCountBadgeBackgroundMessageType
  | FetchStreamBackgroundMessageType

export type FetchAccountsApplicationMessageType = {
  type: 'fetchAccounts'
}
export type ApplicationMessageType = FetchAccountsApplicationMessageType
