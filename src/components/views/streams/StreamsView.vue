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
import { debounce, uniqBy } from 'lodash'
import useStreamOrder from '@/composables/useStreamOrder'
import emitter from '@/events'
import { includeUtil, isSameCategoryName } from '@/utils/util'
import TwitchBusiness from '@/services/business/twitchBusiness'
import useYoutubeLives from '@/composables/useYoutubeLives'
import useStreamTypeFilter from '@/composables/useStreamTypeFilter'
import StreamTypeFilters from '@/components/listStream/StreamTypeFilters.vue'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import { browser } from 'wxt/browser'
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
  mdiYoutube,
} from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const firstLoading = ref<boolean>(true)
const showOfflines = ref<boolean>(false)
const twitchOnlines = ref<StreamItemLiveOnlineType[]>([])
const twitchStreams = ref<StreamItemLiveStreamType[]>([])
const { youtubeStreams, youtubeOnlines, upcomings, youtubeMissingPermission, fetchYoutube, allowYoutubeFeeds } =
  useYoutubeLives()
const { isHiddenByType } = useStreamTypeFilter()
const fetchTimeout = ref<ReturnType<typeof setTimeout>>()
const detailItem = ref<StreamItemType>()
const dump = ref<string>(Date.now().toString())

const filter = ref<string>(system.streamFilter)

const onlines = computed(() => [...twitchOnlines.value, ...youtubeOnlines.value])
const streams = computed(() => [...twitchStreams.value, ...youtubeStreams.value])
const offlines = computed(() =>
  streams.value.filter(
    (value) =>
      !onlines.value.some((item) => item.id === value.id && item.type === value.type) &&
      !upcomings.value.some((item) => item.id === value.id && item.type === value.type)
  )
)

const filterDebounce = debounce(() => (filter.value = system.streamFilter), 250)
watch(
  () => system.streamFilter,
  () => {
    filterDebounce()
  }
)

const { sortStreams } = useStreamOrder(filter)
const itemsFiltered = computed(() =>
  sortStreams(
    uniqBy([...onlines.value, ...upcomings.value, ...offlines.value], (value) => `${value.type}:${value.id}`).filter(
      filterItem
    )
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

function refresh() {
  void fetchData(true)
}
emitter.on('refresh', refresh)
onUnmounted(() => {
  emitter.off('refresh', refresh)
  filterDebounce.cancel()
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
async function allowFeeds() {
  if (await allowYoutubeFeeds()) await fetchData(true)
}

function filterItem(value: StreamItemLiveType): boolean {
  let show = true

  if (isHiddenByType(value, !!filter.value)) show = false
  else if (!showOfflinesComp.value && isOfflineStream(value)) show = false
  else if (!(
    (!system.showFavoritesComp && !system.showNotificationsComp) ||
    (system.showFavoritesComp && favoriteItemEnabled(value)) ||
    (system.showFavoritesComp && favoriteItemCategoryEnabled(value)) ||
    (system.showNotificationsComp && notificationItemEnabled(value)) ||
    (system.showNotificationsComp && notificationItemCategoryEnabled(value))
  ))
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
function favoriteItemCategoryEnabled(item: StreamItemType) {
  if (!isOnlineStream(item) || !item.gameId) return false
  return system.categoryFavorites.some((value) => value.type === item.type && value.id === item.gameId)
}
function notificationItemEnabled(item: StreamItemType) {
  return system.notifications.some((value) => value.type === item.type && value.id === item.id)
}
function notificationItemCategoryEnabled(item: StreamItemType) {
  if (!isOnlineStream(item) || !item.game) return false
  return system.categoryNotifications.some(
    (value) =>
      isSameCategoryName(value.name, item.game) &&
      (!value.streams.length || value.streams.some((stream) => stream.type === item.type && stream.id === item.id))
  )
}

watch(
  () => system.validAccounts,
  () => fetchData()
)

// Calls made while a fetch is running are coalesced into a single extra fetch at the end
let fetching = false
let fetchPending = false
let forcePending = false
// Forced fetches skip the caches of the providers with a small API quota (YouTube)
async function fetchData(force?: boolean) {
  if (fetching) {
    fetchPending = true
    forcePending ||= !!force
    return
  }
  fetching = true

  try {
    system.loading()
    system.refreshing()
    if (fetchTimeout.value) {
      clearTimeout(fetchTimeout.value)
      fetchTimeout.value = undefined
    }

    await Promise.all([fetchOnlineTwitch(), fetchStreamsTwitch(), fetchYoutube(force)])

    // Counts the lives of every account, like the background does
    const message: BackgroundMessageType = {
      type: 'setCountBadge',
      count: onlines.value.length,
    }
    void browser.runtime.sendMessage(message)
  } finally {
    system.loaded()
    system.refreshed()
    firstLoading.value = false
    fetchTimeout.value = setTimeout(fetchData, 60000 * 5)
    fetching = false
    if (fetchPending) {
      const forceNext = forcePending
      fetchPending = false
      forcePending = false
      void fetchData(forceNext)
    }
  }
}

async function fetchOnlineTwitch(): Promise<void> {
  system.loading()
  try {
    if (!system.accounts.twitch || system.accounts.twitch.invalid) {
      twitchOnlines.value = []
      return
    }

    const items: StreamItemLiveOnlineType[] = await TwitchBusiness.getStreamersOnlineFollowed(
      system.accounts.twitch.token,
      system.accounts.twitch.accountId
    )

    dump.value = Date.now().toString()
    twitchOnlines.value = items
  } finally {
    system.loaded()
  }
}

async function fetchStreamsTwitch(): Promise<void> {
  system.loading()
  try {
    if (!system.accounts.twitch || system.accounts.twitch.invalid) {
      twitchStreams.value = []
      return
    }

    twitchStreams.value = system.accountsCacheStreams?.twitch || []
    twitchStreams.value = await system.fetchStreamersFollowed(system.accounts.twitch)
  } finally {
    system.loaded()
  }
}
</script>

<template>
  <ViewContainer>
    <template #top>
      <v-sheet class="px-2 py-1 top-0 filter-content" color="surface-light">
        <v-row class="mx-0 flex-nowrap" density="compact">
          <v-col class="role" :aria-label="t('common.filter')" cols="auto">
            <v-row density="compact" class="flex-nowrap">
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
              <StreamTypeFilters :disabled="!!detailItem" />
            </v-row>
          </v-col>
          <v-spacer />
          <v-col
            v-if="system.notificationType !== 'none'"
            class="role"
            :aria-label="t('common.notification')"
            cols="auto"
          >
            <v-row density="compact" class="flex-nowrap">
              <v-col cols="auto">
                <CategoryNotificationDialog :streams="twitchStreams">
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
      <v-alert
        v-if="youtubeMissingPermission"
        class="rounded-0"
        density="compact"
        :icon="mdiYoutube"
        :text="t('streamsView.youtubePermission')"
        type="warning"
      >
        <template #append>
          <v-btn size="small" variant="tonal" @click="allowFeeds">{{ t('streamsView.allow') }}</v-btn>
        </template>
      </v-alert>
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
