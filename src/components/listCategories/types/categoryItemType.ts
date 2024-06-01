import type { AccountStoreType } from '@/store/system/types/systemStoreType'

export type CategoryItemType = {
  type: AccountStoreType
  id: string
  name: string
  boxArtUrl: string
  igdbId: string
}
