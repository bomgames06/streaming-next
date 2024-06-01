<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AccountStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import StreamList from '@/components/listStream/StreamList.vue'
import type {
  StreamItemLiveOfflineType,
  StreamItemLiveOnlineType,
  StreamItemLiveType,
  StreamItemType,
} from '@/components/listStream/types/streamItemType'
import AppBusiness from '@/services/business/appBusiness'
import { deburr, orderBy, uniqBy } from 'lodash'
import emitter from '@/events'
import { includeUtil } from '@/utils/util'

const system = useSystemStore()
const { t } = useI18n()

const showOfflines = ref<boolean>(false)
const onlines = ref<StreamItemLiveOnlineType[]>([])
const offlines = ref<StreamItemLiveOfflineType[]>([])
const fetchTimeout = ref<ReturnType<typeof setInterval>>()
const detailItem = ref<StreamItemType>()
const dump = ref<string>(Date.now().toString())

const itemsFiltered = computed(() =>
  orderBy(
    uniqBy([...onlines.value, ...offlines.value], (value) => `${value.type}:${value.id}`).filter(filterItem),
    orders.value,
    sorts.value
  )
)
const showOfflinesComp = computed(() => !!system.streamFilter || system.showAlwaysOfflines || showOfflines.value)
const renderOfflinesComp = computed(() => !system.streamFilter && offlines.value.length && !system.showAlwaysOfflines)
const orders = computed(() => {
  const items: ((item: StreamItemLiveType) => string | number)[] = []

  if (!system.streamFilter) items.push(orderStatus)
  if (system.streamOrder === 'name') items.push(orderName)
  if (system.streamOrder === 'view') items.push(orderView)
  if (system.streamOrder === 'game') items.push(orderGame)

  return items
})
const sorts = computed(() => {
  const items: ('asc' | 'desc')[] = []

  if (!system.streamFilter) items.push('desc')
  items.push(system.streamOrderSort ? 'asc' : 'desc')

  return items
})

emitter.on('refresh', fetchData)
onUnmounted(() => {
  emitter.off('refresh', fetchData)
  if (fetchTimeout.value) clearTimeout(fetchTimeout.value)
})
onMounted(() => {
  fetchData()
})

function orderStatus(value: StreamItemLiveType) {
  return value.status
}
function orderName(value: StreamItemLiveType) {
  return deburr(value.name).toLowerCase()
}
function orderView(value: StreamItemLiveType) {
  return value.status === 'online' && value.viewerCount ? value.viewerCount : orderName(value)
}
function orderGame(value: StreamItemLiveType) {
  return value.status === 'online' ? deburr(value.game).toLowerCase() || '' : orderName(value)
}

function filterItem(value: StreamItemLiveType): boolean {
  let show = true

  if (!showOfflinesComp.value && value.status === 'offline') show = false
  else if (system.streamFilter) {
    if (['name', 'view'].includes(system.streamOrder) && !includeUtil(value.name, system.streamFilter)) show = false
    if (
      ['game'].includes(system.streamOrder) &&
      (value.status === 'offline' || !value.game || !includeUtil(value.game, system.streamFilter))
    )
      show = false
  }

  return show
}

async function fetchData() {
  system.loading()
  if (fetchTimeout.value) {
    clearTimeout(fetchTimeout.value)
    fetchTimeout.value = undefined
  }
  try {
    const onlinesFetched: Record<AccountStore['id'], StreamItemLiveOnlineType[]> = await fetchOnline()
    const itemsFetched: StreamItemLiveOnlineType[] = []
    Object.values(onlinesFetched).forEach((value) => itemsFetched.push(...value))
    dump.value = Date.now().toString()
    onlines.value = itemsFetched
    offlines.value = []

    offlines.value = await fetchOfflines(onlinesFetched)
  } finally {
    system.loaded()
    fetchTimeout.value = setTimeout(fetchData, 60000)
  }
}

async function fetchOnline(): Promise<Record<AccountStore['id'], StreamItemLiveOnlineType[]>> {
  system.loading()
  try {
    const promises: Promise<StreamItemLiveOnlineType[]>[] = []
    system.validAccounts.forEach((account) => promises.push(AppBusiness.getStreamersOnlineFollowed(account)))
    const responses = await Promise.all(promises)

    const items: Record<AccountStore['id'], StreamItemLiveOnlineType[]> = {}
    responses.forEach((value, idx) => (items[system.validAccounts[idx].id] = value))

    return items
  } finally {
    system.loaded()
  }
}

async function fetchOfflines(
  exclude: Record<AccountStore['id'], StreamItemLiveOnlineType[]>
): Promise<StreamItemLiveOfflineType[]> {
  system.loading()
  try {
    const promises: Promise<StreamItemLiveOfflineType[]>[] = []
    system.validAccounts.forEach((account) =>
      promises.push(
        AppBusiness.getStreamersOfflineFollowed(
          account,
          exclude[account.id].map((value) => value.id)
        )
      )
    )

    const responses = await Promise.all(promises)
    return responses.reduce((acc, current) => void acc.push(...current) ?? acc, [])
  } finally {
    system.loaded()
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <StreamList v-model:detail-item="detailItem" :items="itemsFiltered" :dump="dump" />
    </v-col>
    <v-col v-if="renderOfflinesComp && !detailItem" cols="12">
      <v-btn height="54" block @click="showOfflines = !showOfflines">
        <v-icon size="x-large" class="mr-2">mdi-wifi-off</v-icon>
        <span>{{ showOfflinesComp ? t('streamsView.hideOfflines') : t('streamsView.showOfflines') }}</span>
      </v-btn>
    </v-col>
  </v-row>
</template>

<style scoped></style>
