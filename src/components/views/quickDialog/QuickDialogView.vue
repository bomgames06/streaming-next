<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { browser } from 'wxt/browser'
import { uniqBy } from 'lodash'
import useStreamOrder from '@/composables/useStreamOrder'
import StreamOrderMenu from '@/components/listStream/StreamOrderMenu.vue'
import useSystemStore from '@/store/system/useSystemStore'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemLiveType,
  StreamItemType,
} from '@/components/listStream/types/streamItemType'
import { isOnlineStream, isStream } from '@/components/listStream/types/streamItemType'
import { includeUtil, streamItemProfileUrl } from '@/utils/util'
import { closeQuickDialog } from '@/utils/quickDialog'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import { mdiClose, mdiFilter, mdiStar, mdiStarOutline } from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const filter = ref<string>('')
const onlyFavorites = ref<boolean>(false)
const loading = ref<boolean>(true)
const onlines = ref<StreamItemLiveOnlineType[]>([])
const streams = ref<StreamItemLiveStreamType[]>(system.accountsCacheStreams?.twitch || [])
const dump = Date.now().toString()
const listRef = ref<HTMLElement>()

const offlines = computed(() =>
  streams.value.filter((value) => !onlines.value.some((item) => item.id === value.id && item.type === value.type))
)
// Same order configured on the streams view, changing it here also changes it there
const { sortStreams } = useStreamOrder(filter)
// Same rule as the streams view: offlines only show up when searching or filtering favorites
const showOfflines = computed(() => !!filter.value || onlyFavorites.value || system.showAlwaysOfflines)
const items = computed<StreamItemLiveType[]>(() => {
  let values: StreamItemLiveType[] = uniqBy(
    [...onlines.value, ...(showOfflines.value ? offlines.value : [])],
    (value) => `${value.type}:${value.id}`
  )

  if (onlyFavorites.value) values = values.filter(isFavorite)
  if (filter.value) values = values.filter(matchFilter)

  return sortStreams(values)
})

onMounted(fetchData)

async function fetchData() {
  const account = system.accounts.twitch
  if (!account || account.invalid) return void (loading.value = false)

  system.loading()
  try {
    const [onlineItems, streamItems] = await Promise.all([
      TwitchBusiness.getStreamersOnlineFollowed(account.token, account.accountId),
      system.fetchStreamersFollowed(account),
    ])
    onlines.value = onlineItems
    streams.value = streamItems
  } finally {
    loading.value = false
    system.loaded()
  }
}

function isFavorite(item: StreamItemLiveType) {
  if (system.favorites.some((value) => value.type === item.type && value.id === item.id)) return true
  return (
    isOnlineStream(item) &&
    !!item.gameId &&
    system.categoryFavorites.some((value) => value.type === item.type && value.id === item.gameId)
  )
}
function matchFilter(item: StreamItemLiveType) {
  return (
    includeUtil(item.name, filter.value) ||
    includeUtil(item.login, filter.value) ||
    (isOnlineStream(item) && includeUtil(item.game, filter.value))
  )
}

function openItem({ item, middle }: { item: StreamItemType; middle?: boolean }) {
  if (!isStream(item)) return
  void browser.tabs.create({ url: streamItemProfileUrl(item), active: !middle })
  // A middle click opens in background, keeping the dialog open to pick more streams
  if (!middle) closeQuickDialog()
}

function openFirst() {
  const item = items.value[0]
  if (item) openItem({ item })
}

function listItemElements(): HTMLElement[] {
  return Array.from(listRef.value?.querySelectorAll<HTMLElement>('.v-list-item') ?? [])
}
function focusFirstItem() {
  listItemElements()[0]?.focus()
}
// The arrow navigation inside the list is done by VList itself, handling it here too moved the focus twice.
// This runs on capture, before VList, only to go back to the filter instead of wrapping to the last item.
function onListKeydownCapture(event: KeyboardEvent) {
  if (event.key !== 'ArrowUp' || listItemElements()[0] !== document.activeElement) return
  event.preventDefault()
  event.stopPropagation()
  document.getElementById('quick-dialog-filter')?.focus()
}
</script>

<template>
  <v-layout class="h-100">
    <v-app-bar class="app-bar" :height="system.appBarHeight">
      <div class="d-flex w-100 position-relative align-center app-bar-view pl-2">
        <v-progress-linear v-if="system.isLoading" absolute color="primary" indeterminate location="bottom" />
        <v-text-field
          id="quick-dialog-filter"
          v-model.trim="filter"
          autofocus
          class="clearable-appbar"
          clearable
          color="primary"
          :label="t('quickDialog.filter')"
          persistent-clear
          variant="outlined"
          @keydown.enter.prevent="openFirst"
          @keydown.down.prevent="focusFirstItem"
        />
        <StreamOrderMenu />
        <v-btn
          :aria-label="t('quickDialog.close')"
          class="rounded-lg"
          :icon="true"
          :size="system.appBarHeight"
          @click="closeQuickDialog"
        >
          <v-icon :icon="mdiClose" />
        </v-btn>
      </div>
    </v-app-bar>
    <v-main class="d-flex">
      <div class="overflow-y-auto flex-grow-1">
        <ViewContainer>
          <template #top>
            <v-sheet class="px-2 py-1 top-0 filter-content" color="surface-light">
              <v-row class="mx-0 flex-nowrap align-center" density="compact">
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
                        v-tooltip="t('common.favorite', 2)"
                        accesskey="b"
                        :aria-checked="onlyFavorites"
                        :aria-label="t('common.favorite', 2)"
                        class="rounded-lg"
                        :icon="true"
                        role="checkbox"
                        size="24"
                        @click="onlyFavorites = !onlyFavorites"
                      >
                        <v-icon :color="onlyFavorites ? 'primary' : ''" size="18">
                          {{ onlyFavorites ? mdiStar : mdiStarOutline }}
                        </v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-col>
                <v-spacer />
                <v-col cols="auto" class="text-body-small text-medium-emphasis">
                  {{ t('quickDialog.hint') }}
                </v-col>
              </v-row>
            </v-sheet>
            <v-divider />
          </template>
          <div ref="listRef" class="d-flex flex-column flex-grow-1" @keydown.capture="onListKeydownCapture">
            <v-list v-if="items.length" class="bg-transparent py-0">
              <template v-for="(item, idx) in items" :key="`${item.type}:${item.id}`">
                <StreamListItem disable-context-menu :dump="dump" :item="item" @item-click="openItem" />
                <v-divider v-if="idx !== items.length - 1" />
              </template>
            </v-list>
            <v-row v-else density="compact" class="align-center justify-center flex-grow-1">
              <v-col v-if="loading" cols="auto" class="text-center">
                <v-progress-circular color="primary" indeterminate />
              </v-col>
              <v-col v-else cols="auto" class="text-center">
                {{ t('streamList.noItems') }}
              </v-col>
            </v-row>
          </div>
        </ViewContainer>
      </div>
    </v-main>
  </v-layout>
</template>

<style scoped lang="scss">
.filter-content {
  z-index: 10;
}
.app-bar-view {
  ::v-deep(.v-label.v-field-label) {
    font-size: 0.75rem !important;
    margin: 0 8px;
  }
  ::v-deep(.v-field__input) {
    font-size: 0.75rem !important;
    padding: 2px 6px;
    min-height: 0;
  }
}
</style>
