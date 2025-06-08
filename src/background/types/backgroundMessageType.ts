import type { AccountStoreType } from '@/store/system/types/systemStoreType'

export type AuthBackgroundMessageType = {
  type: 'auth'
  authType: AccountStoreType
  forceVerify?: boolean
  interactive?: boolean
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
export type GetAccessTokenChromeBackgroundMessageType = {
  type: 'getAccessTokenChrome'
}
export type BackgroundMessageType =
  | AuthBackgroundMessageType
  | RevokeBackgroundMessageType
  | InvalidateBadgeBackgroundMessageType
  | SetCountBadgeBackgroundMessageType
  | FetchStreamBackgroundMessageType
  | GetAccessTokenChromeBackgroundMessageType

export type FetchAccountsApplicationMessageType = {
  type: 'fetchAccounts'
}
export type ApplicationMessageType = FetchAccountsApplicationMessageType
