import useSystemStore from '@/store/system/useSystemStore'
import { ACCOUNT_STORE_TYPES } from '@/store/system/types/systemStoreType'
import type { StreamItemLiveType } from '@/components/listStream/types/streamItemType'
import { isUpcomingStream } from '@/components/listStream/types/streamItemType'

/**
 * Platform and upcoming filters configured by the user (store `hiddenStreamTypes`/`showUpcomings`).
 */
export default function useStreamTypeFilter() {
  const system = useSystemStore()

  const hasYoutube = computed(() => !!system.accounts.youtube && !system.accounts.youtube.invalid)
  const streamTypes = computed(() =>
    ACCOUNT_STORE_TYPES.filter((type) => system.validAccounts.some((account) => account.type === type))
  )
  // The platform filter only makes sense with more than one platform, it also avoids hiding everything with no way back
  const showTypeFilter = computed(() => streamTypes.value.length > 1)

  /** Upcoming lives always show up while searching by name, like the offlines */
  function isHiddenByType(item: StreamItemLiveType, searching?: boolean): boolean {
    if (showTypeFilter.value && system.hiddenStreamTypes.includes(item.type)) return true
    return !system.showUpcomingsComp && !searching && isUpcomingStream(item)
  }

  return { hasYoutube, streamTypes, showTypeFilter, isHiddenByType }
}
