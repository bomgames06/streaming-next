<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemLiveType,
  StreamItemType,
} from '@/components/listStream/types/streamItemType'
import { isOfflineStream, isOnlineStream } from '@/components/listStream/types/streamItemType'
import { debounce, deburr, orderBy, uniqBy } from 'lodash'
import emitter from '@/events'
import { includeUtil } from '@/utils/util'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import browser from 'webextension-polyfill'
import StreamGroupList from '@/components/listStream/StreamGroupList.vue'
import {
  mdiBell,
  mdiBellOutline,
  mdiController,
  mdiFilter,
  mdiFolder,
  mdiFolderOutline,
  mdiStar,
  mdiStarOutline,
  mdiWifiOff,
} from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const firstLoading = ref<boolean>(true)
const showOfflines = ref<boolean>(false)
const onlines = ref<StreamItemLiveOnlineType[]>([])
const streams = ref<StreamItemLiveStreamType[]>([])
const fetchTimeout = ref<ReturnType<typeof setInterval>>()
const detailItem = ref<StreamItemType>()
const dump = ref<string>(Date.now().toString())

const filter = ref<string>(system.streamFilter)

const offlines = computed(() =>
  streams.value.filter((value) => !onlines.value.some((item) => item.id === value.id && item.type === value.type))
)

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

function toggleGroups() {
  system.showGroupsComp = !system.showGroupsComp
}
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
  return isOnlineStream(value) ? 1 : 0
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

  if (!showOfflinesComp.value && isOfflineStream(value)) show = false
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
      (isOfflineStream(value) || value.type !== 'twitch' || !value.game || !includeUtil(value.game, filter.value))
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

  try {
    system.loading()
    system.refreshing()
    if (fetchTimeout.value) {
      clearTimeout(fetchTimeout.value)
      fetchTimeout.value = undefined
    }

    await Promise.all([fetchOnlineTwitch(), fetchStreamsTwitch()])
  } finally {
    system.loaded()
    system.refreshed()
    firstLoading.value = false
    fetchTimeout.value = setTimeout(fetchData, 60000 * 5)
    fetching -= 1
    if (fetching) void fetchData()
  }
}

async function fetchOnlineTwitch(): Promise<void> {
  system.loading()
  try {
    if (!system.accounts.twitch || system.accounts.twitch.invalid) {
      onlines.value = []
      return
    }

    const items: StreamItemLiveOnlineType[] = await TwitchBusiness.getStreamersOnlineFollowed(
      system.accounts.twitch.token,
      system.accounts.twitch.accountId
    )

    const message: BackgroundMessageType = {
      type: 'setCountBadge',
      count: items.length,
    }
    void browser.runtime.sendMessage(message)

    dump.value = Date.now().toString()
    onlines.value = items
  } finally {
    system.loaded()
  }
}

async function fetchStreamsTwitch(): Promise<void> {
  system.loading()
  try {
    if (!system.accounts.twitch || system.accounts.twitch.invalid) {
      streams.value = []
      return
    }

    streams.value = system.accountsCacheStreams?.twitch || []
    streams.value = await TwitchBusiness.getStreamersFollowed(
      system.accounts.twitch.token,
      system.accounts.twitch.accountId
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
        <v-row class="mx-0 flex-nowrap" dense>
          <v-col :aria-label="t('common.filter')" role="group" cols="auto">
            <v-row dense class="flex-nowrap">
              <v-col cols="auto">
                <v-icon :icon="mdiFilter" />
              </v-col>
              <v-col class="d-flex" cols="auto">
                <v-divider class="h-75 align-self-center" vertical />
              </v-col>
              <v-col cols="auto">
                <v-btn
                  v-tooltip="t('common.group')"
                  accesskey="g"
                  :aria-label="t('common.group')"
                  class="rounded-lg"
                  :disabled="!!detailItem"
                  :icon="true"
                  role="checkbox"
                  size="24"
                  @click="toggleGroups"
                >
                  <v-icon :color="system.showGroupsComp ? 'primary' : ''" size="18">
                    {{ system.showGroupsComp ? mdiFolder : mdiFolderOutline }}
                  </v-icon>
                </v-btn>
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
                  <v-icon :color="system.showFavoritesComp ? 'primary' : ''" size="18">
                    {{ system.showFavoritesComp ? mdiStar : mdiStarOutline }}
                  </v-icon>
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
                    system.showNotificationsComp ? mdiBell : mdiBellOutline
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
                  <v-icon :color="showOfflinesComp ? 'primary' : ''" size="18" :icon="mdiWifiOff" />
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
          <v-spacer />
          <v-col
            v-if="system.notificationType !== 'none'"
            :aria-label="t('common.notification')"
            role="group"
            cols="auto"
          >
            <v-row dense class="flex-nowrap">
              <v-col cols="auto">
                <CategoryNotificationDialog :streams="streams">
                  <template #activator="{ props }">
                    <v-btn
                      v-tooltip:start="t('streamsView.category')"
                      v-bind="props"
                      :aria-label="t('streamsView.category')"
                      class="rounded-lg"
                      :icon="true"
                      size="24"
                    >
                      <v-icon size="18" :icon="mdiController" />
                    </v-btn>
                  </template>
                </CategoryNotificationDialog>
              </v-col>
              <v-col class="d-flex" cols="auto">
                <v-divider class="h-75 align-self-center" vertical />
              </v-col>
              <v-col cols="auto">
                <v-icon :icon="mdiBell" />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-sheet>
      <v-divider />
    </template>
    <StreamGroupList
      v-if="system.showGroupsComp"
      v-model:detail-item="detailItem"
      :dump="dump"
      :items="itemsFiltered"
      :streams="streams"
      :first-loading="firstLoading"
    />
    <StreamList
      v-else
      v-model:detail-item="detailItem"
      :dump="dump"
      :items="itemsFiltered"
      :streams="streams"
      :loading="firstLoading"
    />
  </ViewContainer>
</template>

<style scoped lang="scss">
.filter-content {
  z-index: 10;
}
</style>
