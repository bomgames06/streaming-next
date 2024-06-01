import type { AccountStoreType } from '@/store/system/types/systemStoreType'

export type User = {
  type: AccountStoreType
  id: string
  name: string
  login: string
  avatarUrl?: string
}
