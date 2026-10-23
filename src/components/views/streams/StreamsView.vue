<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemLiveType,
  StreamItemLiveUpcomingType,
  StreamItemType,
} from '@/components/listStream/types/streamItemType'
import { isOfflineStream, isOnlineStream, isUpcomingStream } from '@/components/listStream/types/streamItemType'
import { debounce, uniqBy } from 'lodash'
import useStreamOrder from '@/composables/useStreamOrder'
import emitter from '@/events'
import { accountTypeColor, includeUtil, isSameCategoryName } from '@/utils/util'
import TwitchBusiness from '@/services/business/twitchBusiness'
import YoutubeBusiness from '@/services/business/youtubeBusiness'
import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import { ACCOUNT_STORE_TYPES } from '@/store/system/types/systemStoreType'
import type { BackgroundMessageType } from '@/background/types/backgroundMessageType'
import { browser } from 'wxt/browser'
import StreamGroupList from '@/components/listStream/StreamGroupList.vue'
import {
  mdiBell,
  mdiBellOutline,
  mdiCalendarClock,
  mdiController,
  mdiFilter,
  mdiFolder,
  mdiFolderOutline,
  mdiStar,
  mdiStarOutline,
  mdiTwitch,
  mdiWifiOff,
  mdiYoutube,
} from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const firstLoading = ref<boolean>(true)
const showOfflines = ref<boolean>(false)
const twitchOnlines = ref<StreamItemLiveOnlineType[]>([])
const twitchStreams = ref<StreamItemLiveStreamType[]>([])
const youtubeOnlines = ref<StreamItemLiveOnlineType[]>([])
const youtubeStreams = ref<StreamItemLiveStreamType[]>([])
const upcomings = ref<StreamItemLiveUpcomingType[]>([])
const youtubeMissingPermission = ref<boolean>(false)
const fetchTimeout = ref<ReturnType<typeof setTimeout>>()
const detailItem = ref<StreamItemType>()
const dump = ref<string>(Date.now().toString())

const filter = ref<string>(system.streamFilter)

const typeIcons: Record<AccountStoreType, string> = { twitch: mdiTwitch, youtube: mdiYoutube }

const onlines = computed(() => [...twitchOnlines.value, ...youtubeOnlines.value])
const streams = computed(() => [...twitchStreams.value, ...youtubeStreams.value])
const offlines = computed(() =>
  streams.value.filter(
    (value) =>
      !onlines.value.some((item) => item.id === value.id && item.type === value.type) &&
      !upcomings.value.some((item) => item.id === value.id && item.type === value.type)
  )
)
const hasYoutube = computed(() => !!system.accounts.youtube && !system.accounts.youtube.invalid)
// The platform filter only makes sense with more than one platform, it also avoids hiding everything with no way back
const streamTypes = computed(() =>
  ACCOUNT_STORE_TYPES.filter((type) => system.validAccounts.some((account) => account.type === type))
)
const showTypeFilter = computed(() => streamTypes.value.length > 1)

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
function toggleUpcomings() {
  system.showUpcomingsComp = !system.showUpcomingsComp
}
async function allowYoutubeFeeds() {
  if (await YoutubeBusiness.requestFeedPermission()) await fetchData(true)
}

function filterItem(value: StreamItemLiveType): boolean {
  let show = true

  if (showTypeFilter.value && system.hiddenStreamTypes.includes(value.type)) show = false
  else if (!showOfflinesComp.value && isOfflineStream(value)) show = false
  else if (!system.showUpcomingsComp && !filter.value && isUpcomingStream(value)) show = false
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

async function fetchYoutube(force?: boolean): Promise<void> {
  system.loading()
  try {
    const account = system.accounts.youtube
    if (account) await system.renewAccountToken(account)
    if (!account || account.invalid) {
      youtubeStreams.value = []
      youtubeOnlines.value = []
      upcomings.value = []
      youtubeMissingPermission.value = false
      return
    }

    youtubeStreams.value = system.accountsCacheStreams?.youtube || []
    youtubeStreams.value = await system.fetchStreamersFollowed(account)

    const lives = await YoutubeBusiness.getLivesFollowed(
      account.token,
      account.accountId,
      youtubeStreams.value.map((value) => value.id),
      force
    )
    youtubeOnlines.value = lives.onlines
    upcomings.value = lives.upcomings
    youtubeMissingPermission.value = lives.missingPermission
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
              <v-col v-if="hasYoutube" cols="auto">
                <v-btn
                  v-tooltip="t('common.upcomings')"
                  :aria-checked="system.showUpcomingsComp"
                  :aria-label="t('common.upcomings')"
                  class="rounded-lg"
                  :disabled="!!detailItem"
                  :icon="true"
                  role="checkbox"
                  size="24"
                  @click="toggleUpcomings"
                >
                  <v-icon :color="system.showUpcomingsComp ? 'primary' : ''" size="18" :icon="mdiCalendarClock" />
                </v-btn>
              </v-col>
              <template v-if="showTypeFilter">
                <v-col class="d-flex" cols="auto">
                  <v-divider class="h-75 align-self-center" vertical />
                </v-col>
                <v-col v-for="type in streamTypes" :key="type" cols="auto">
                  <v-btn
                    v-tooltip="t(`accountTypes.${type}`)"
                    :aria-checked="!system.hiddenStreamTypes.includes(type)"
                    :aria-label="t(`accountTypes.${type}`)"
                    class="rounded-lg"
                    :data-testid="`stream-type-${type}`"
                    :disabled="!!detailItem"
                    :icon="true"
                    role="checkbox"
                    size="24"
                    @click="system.toggleHiddenStreamType(type)"
                  >
                    <v-icon
                      :color="system.hiddenStreamTypes.includes(type) ? '' : accountTypeColor(type)"
                      size="18"
                      :icon="typeIcons[type]"
                    />
                  </v-btn>
                </v-col>
              </template>
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
          <v-btn size="small" variant="tonal" @click="allowYoutubeFeeds">{{ t('streamsView.allow') }}</v-btn>
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
