<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AccountStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import StreamList from '@/components/listStream/StreamList.vue'
import type {
  StreamItemLiveOfflineType,
  StreamItemLiveOnlineType,
  StreamItemLiveType,
  StreamItemType,
} from '@/components/listStream/types/streamItemType'
import { debounce, deburr, orderBy, uniqBy } from 'lodash'
import emitter from '@/events'
import { includeUtil } from '@/utils/util'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import browser from 'webextension-polyfill'

const system = useSystemStore()
const { t } = useI18n()

const showOfflines = ref<boolean>(false)
const onlines = ref<StreamItemLiveOnlineType[]>([])
const offlines = ref<StreamItemLiveType[]>([])
const fetchTimeout = ref<ReturnType<typeof setInterval>>()
const detailItem = ref<StreamItemType>()
const dump = ref<string>(Date.now().toString())

const filter = ref<string>(system.streamFilter)

const filterDebounce = debounce(() => (filter.value = system.streamFilter), 250)
watch(
  () => system.streamFilter,
  () => {
    filterDebounce()
  }
)

const itemsFiltered = computed(() =>
  orderBy(
    uniqBy([...onlines.value, ...offlines.value], (value) => `${value.type}:${value.id}`).filter(filterItem),
    orders.value,
    sorts.value
  )
)
const showOfflinesComp = computed(() => !!filter.value || system.showAlwaysOfflines || showOfflines.value)
const renderOfflinesComp = computed(() => !filter.value && offlines.value.length && !system.showAlwaysOfflines)
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
  return value.status === 'online' && value.type === 'twitch'
    ? deburr(value.game).toLowerCase() || ''
    : orderName(value)
}
function orderType(value: StreamItemType) {
  return value.type
}

function filterItem(value: StreamItemLiveType): boolean {
  let show = true

  if (!showOfflinesComp.value && value.status === 'offline') show = false
  else if (filter.value) {
    if (['name', 'view'].includes(system.streamOrder) && !includeUtil(value.name, filter.value)) show = false
    if (
      ['game'].includes(system.streamOrder) &&
      (value.status === 'offline' || value.type !== 'twitch' || !value.game || !includeUtil(value.game, filter.value))
    )
      show = false
  }

  return show
}

watch(() => system.validAccounts, fetchData)

let fetching = 0
async function fetchData() {
  if (fetching) {
    fetching += 1
    return
  }
  fetching += 1

  system.loading()
  system.refreshing()
  if (fetchTimeout.value) {
    clearTimeout(fetchTimeout.value)
    fetchTimeout.value = undefined
  }
  try {
    const onlinesFetched: Record<AccountStore['id'], StreamItemLiveOnlineType[]> = await fetchOnlineTwitch()
    const itemsFetched: StreamItemLiveOnlineType[] = []
    Object.values(onlinesFetched).forEach((value) => itemsFetched.push(...value))
    dump.value = Date.now().toString()
    onlines.value = itemsFetched
    offlines.value = []

    offlines.value = await fetchOfflinesTwitch(onlinesFetched)
  } finally {
    system.loaded()
    system.refreshed()
    fetchTimeout.value = setTimeout(fetchData, 60000 * 5)
    fetching -= 1
    if (fetching) void fetchData()
  }
}

async function fetchOnlineTwitch(): Promise<Record<AccountStore['id'], StreamItemLiveOnlineType[]>> {
  system.loading()
  try {
    const promises: Promise<StreamItemLiveOnlineType[]>[] = []
    system.validAccounts
      .filter((value) => value.type === 'twitch')
      .forEach((account) => promises.push(TwitchBusiness.getStreamersOnlineFollowed(account.token, account.accountId)))
    const responses = await Promise.all(promises)

    const items: Record<AccountStore['id'], StreamItemLiveOnlineType[]> = {}
    let counts = 0
    responses.forEach((value, idx) => {
      items[system.validAccounts[idx].id] = value
      counts += value.length
    })

    const message: BackgroundMessageType = {
      type: 'setCountBadge',
      count: counts,
    }
    void browser.runtime.sendMessage(message)

    return items
  } finally {
    system.loaded()
  }
}

async function fetchOfflinesTwitch(
  exclude: Record<AccountStore['id'], StreamItemLiveOnlineType[]>
): Promise<StreamItemLiveOfflineType[]> {
  system.loading()
  try {
    const promises: Promise<StreamItemLiveOfflineType[]>[] = []
    system.validAccounts
      .filter((value) => value.type === 'twitch')
      .forEach((account) =>
        promises.push(
          TwitchBusiness.getStreamersOfflineFollowed(
            account.token,
            account.accountId,
            exclude[account.id].map((value) => value.id)
          )
        )
      )

    const responses = await Promise.all(promises)
    return responses.reduce((acc, current) => void acc.push(...current) || acc, [])
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
