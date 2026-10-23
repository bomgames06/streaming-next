import type { Ref } from 'vue'
import { deburr, orderBy } from 'lodash'
import useSystemStore from '@/store/system/useSystemStore'
import type { StreamItemLiveType } from '@/components/listStream/types/streamItemType'
import { isOnlineStream, isUpcomingStream } from '@/components/listStream/types/streamItemType'

// Upcoming lives are sorted together with the online ones
function orderStatus(value: StreamItemLiveType) {
  return isOnlineStream(value) || isUpcomingStream(value) ? 1 : 0
}
function orderName(value: StreamItemLiveType) {
  return deburr(value.name).toLowerCase()
}
function orderView(value: StreamItemLiveType) {
  // Upcoming lives have no viewers yet
  if (isUpcomingStream(value)) return 0
  return value.status === 'online' && value.viewerCount ? value.viewerCount : orderName(value)
}
function orderGame(value: StreamItemLiveType) {
  return value.status === 'online' && value.type === 'twitch'
    ? deburr(value.game).toLowerCase() || ''
    : orderName(value)
}
function orderType(value: StreamItemLiveType) {
  return value.type
}

/**
 * Stream list ordering configured by the user (store `streamOrder`/`streamOrderSort`).
 * Online and upcoming streams come first, except while filtering, where only the configured order matters.
 */
export default function useStreamOrder(filter: Ref<string | undefined>) {
  const system = useSystemStore()

  const orders = computed(() => {
    const items: ((item: StreamItemLiveType) => string | number)[] = []

    if (!filter.value) items.push(orderStatus)
    if (system.streamOrder === 'name') items.push(orderName)
    if (system.streamOrder === 'view') items.push(orderView)
    if (system.streamOrder === 'game') items.push(orderGame)
    items.push(orderType)

    return items
  })
  const sorts = computed(() => {
    const items: ('asc' | 'desc')[] = []

    if (!filter.value) items.push('desc')
    items.push(system.streamOrderSort ? 'asc' : 'desc')
    items.push('asc')

    return items
  })

  function sortStreams<T extends StreamItemLiveType>(items: T[]): T[] {
    return orderBy(items, orders.value, sorts.value)
  }

  return { sortStreams }
}
