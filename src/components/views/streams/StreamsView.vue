<script setup lang="ts">
import { useI18n } from 'vue-i18n'
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
import ViewContainer from '@/components/viewContainer/ViewContainer.vue'
import { v4 as uuidV4 } from 'uuid'

const system = useSystemStore()
const { t } = useI18n()

const showOfflines = ref<boolean>(false)
const onlines = ref<StreamItemLiveOnlineType[]>([])
const offlines = ref<StreamItemLiveOfflineType[]>([])
const fetchTimeout = ref<ReturnType<typeof setInterval>>()
const detailItem = ref<StreamItemType>()
const dump = ref<string>(Date.now().toString())

const filter = ref<string>(system.streamFilter)
const filterLabelId = uuidV4()

const filterDebounce = debounce(() => (filter.value = system.streamFilter), 250)
watch(
  () => system.streamFilter,
  () => {
    filterDebounce()
  }
)

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
const itemsFiltered = computed(() =>
  orderBy(
    uniqBy([...onlines.value, ...offlines.value], (value) => `${value.type}:${value.id}`).filter(filterItem),
    orders.value,
    sorts.value
  )
)
const showOfflinesComp = computed(
  () =>
    !!filter.value ||
    system.showAlwaysOfflines ||
    showOfflines.value ||
    system.showFavoritesComp ||
    system.showNotificationsComp
)
const renderOfflinesComp = computed(
  () =>
    !filter.value &&
    offlines.value.length &&
    !system.showAlwaysOfflines &&
    !detailItem.value &&
    !system.showFavoritesComp &&
    !system.showNotificationsComp
)

emitter.on('refresh', fetchData)
onUnmounted(() => {
  emitter.off('refresh', fetchData)
  if (fetchTimeout.value) clearTimeout(fetchTimeout.value)
})
onMounted(() => {
  fetchData()
})

function toggleFavorite() {
  system.showFavoritesComp = !system.showFavoritesComp
}
function toggleNotification() {
  system.showNotificationsComp = !system.showNotificationsComp
}
function toggleOffline() {
  showOfflines.value = !showOfflines.value
}

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
  else if (
    !(
      (!system.showFavoritesComp && !system.showNotificationsComp) ||
      (system.showFavoritesComp && favoriteItemEnabled(value)) ||
      (system.showNotificationsComp && notificationItemEnabled(value))
    )
  )
    show = false
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

function favoriteItemEnabled(item: StreamItemType) {
  return system.favorites.some((value) => value.type === item.type && value.id === item.id)
}
function notificationItemEnabled(item: StreamItemType) {
  return system.notifications.some((value) => value.type === item.type && value.id === item.id)
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
    const onlinesFetched: StreamItemLiveOnlineType[] = await fetchOnlineTwitch()
    dump.value = Date.now().toString()
    onlines.value = onlinesFetched
    offlines.value = system.accountsCacheStreams?.twitch || []

    offlines.value = await fetchOfflinesTwitch(onlinesFetched)
  } finally {
    system.loaded()
    system.refreshed()
    fetchTimeout.value = setTimeout(fetchData, 60000 * 5)
    fetching -= 1
    if (fetching) void fetchData()
  }
}

async function fetchOnlineTwitch(): Promise<StreamItemLiveOnlineType[]> {
  system.loading()
  try {
    if (!system.accounts.twitch || system.accounts.twitch.invalid) return []

    const items: StreamItemLiveOnlineType[] = await TwitchBusiness.getStreamersOnlineFollowed(
      system.accounts.twitch.token,
      system.accounts.twitch.accountId
    )

    const message: BackgroundMessageType = {
      type: 'setCountBadge',
      count: items.length,
    }
    void browser.runtime.sendMessage(message)

    return items
  } finally {
    system.loaded()
  }
}

async function fetchOfflinesTwitch(exclude: StreamItemLiveOnlineType[]): Promise<StreamItemLiveOfflineType[]> {
  system.loading()
  try {
    if (!system.accounts.twitch || system.accounts.twitch.invalid) return []

    return TwitchBusiness.getStreamersOfflineFollowed(
      system.accounts.twitch.token,
      system.accounts.twitch.accountId,
      exclude.map((value) => value.id)
    )
  } finally {
    system.loaded()
  }
}
</script>

<template>
  <ViewContainer>
    <template #top>
      <v-sheet class="px-2 py-1 top-0 filter-content" color="surface-light">
        <v-row :aria-label="t('common.filter')" class="mx-0" dense role="group">
          <v-col :id="filterLabelId" cols="auto">
            <v-icon>mdi-filter</v-icon>
          </v-col>
          <v-col class="d-flex" cols="auto">
            <v-divider class="h-75 align-self-center" vertical />
          </v-col>
          <v-col cols="auto">
            <v-btn
              v-tooltip="t('common.favorite', 2)"
              accesskey="b"
              :aria-checked="system.showFavoritesComp"
              :aria-label="t('common.favorite', 2)"
              class="rounded-lg"
              :disabled="!!detailItem"
              :icon="true"
              role="checkbox"
              size="24"
              @click="toggleFavorite"
            >
              <v-icon :color="system.showFavoritesComp ? 'primary' : ''" size="18">{{
                system.showFavoritesComp ? 'mdi-star' : 'mdi-star-outline'
              }}</v-icon>
            </v-btn>
          </v-col>
          <v-col v-if="system.notificationType === 'partial'" cols="auto">
            <v-btn
              v-tooltip="t('common.notification', 2)"
              accesskey="n"
              :aria-checked="system.showNotificationsComp"
              :aria-label="t('common.notification', 2)"
              class="rounded-lg"
              :disabled="!!detailItem"
              :icon="true"
              role="checkbox"
              size="24"
              @click="toggleNotification"
            >
              <v-icon :color="system.showNotificationsComp ? 'primary' : ''" size="18">{{
                system.showNotificationsComp ? 'mdi-bell' : 'mdi-bell-outline'
              }}</v-icon>
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn
              v-tooltip="t('common.offlines')"
              accesskey="o"
              :aria-checked="showOfflines"
              :aria-label="t('common.offlines')"
              class="rounded-lg"
              :disabled="!renderOfflinesComp"
              :icon="true"
              role="checkbox"
              size="24"
              @click="toggleOffline"
            >
              <v-icon :color="showOfflinesComp ? 'primary' : ''" size="18"> mdi-wifi-off </v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-sheet>
      <v-divider />
    </template>
    <StreamList v-model:detail-item="detailItem" :dump="dump" :items="itemsFiltered" />
  </ViewContainer>
</template>

<style scoped lang="scss">
.filter-content {
  z-index: 10;
}
</style>
