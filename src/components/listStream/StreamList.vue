<script setup lang="ts">
import type {
  StreamItemClipType,
  StreamItemLiveStreamType,
  StreamItemLiveType,
  StreamItemType,
  StreamItemVideoType,
} from '@/components/listStream/types/streamItemType'
import { isContentStream, isStream } from '@/components/listStream/types/streamItemType'
import browser from 'webextension-polyfill'
import { streamItemProfileUrl } from '@/utils/util'
import AppBusiness from '@/services/business/appBusiness'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import { VList } from 'vuetify/components/VList'
import { v4 as uuidV4 } from 'uuid'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<{
  items: StreamItemType[]
  disableContextMenu?: boolean
  disableCategoryMenu?: boolean
  disableNotificationMenu?: boolean
  disableViewCount?: boolean
  dump?: string
  parent?: StreamItemType
  streams?: StreamItemLiveStreamType[]
}>()

const detailItem = defineModel<StreamItemType | undefined>('detailItem')
const menuShow = ref<StreamItemType>()

const detailType = ref<'video' | 'clip'>()
const videos = reactive<{ items: StreamItemVideoType[]; cursor?: string }>({
  items: [],
})
const clips = reactive<{ items: StreamItemClipType[]; cursor?: string }>({
  items: [],
})
const keyListItem = uuidV4()

const streamCategoryNotification = ref<StreamItemLiveStreamType>()

const hasMoreItems = computed(() => {
  if (detailType.value === 'video') return !!videos.cursor
  if (detailType.value === 'clip') return !!clips.cursor
  return false
})

function equals(a: StreamItemType, b: StreamItemType) {
  return a.type === b.type && a.id === b.id
}

function itemClick(value: { item: StreamItemType; middle?: boolean }): void {
  if (detailItem.value) return void (detailItem.value = undefined)
  if (value.item.type === 'twitch') {
    if (isStream(value.item))
      return void browser.tabs.create({ url: streamItemProfileUrl(value.item), active: !value.middle })
    if (isContentStream(value.item)) return void browser.tabs.create({ url: value.item.url, active: !value.middle })
  }
}

watch(props.items, (items) => {
  if (detailItem.value) detailItem.value = items.find((value) => equals(value, detailItem.value!))
})

function menuItemClick(value: { type: 'video' | 'clip'; item: StreamItemType }): void {
  detailItem.value = value.item

  videos.items = []
  videos.cursor = undefined
  clips.items = []
  clips.cursor = undefined

  nextTick(() => {
    if (value.type === 'video') enableVideo()
    if (value.type === 'clip') enableClip()
  })
}
function enableVideo() {
  system.setVideoOrder('time')
  detailType.value = 'video'
  fetchVideos()
}
function enableClip() {
  system.setClipPeriod('7d')
  detailType.value = 'clip'
  fetchClips()
}

watch([detailType, detailItem], () => {
  if (!detailItem.value) return void system.setHeaderAppBarView(undefined)
  system.setHeaderAppBarView(detailType.value)
})
watch(
  () => system.videoOrder,
  () => {
    videos.cursor = undefined
    fetchVideos()
  }
)
watch(
  () => system.clipPeriod,
  () => {
    clips.cursor = undefined
    fetchClips()
  }
)

function fetchMore() {
  if (detailType.value === 'video') fetchVideos()
  if (detailType.value === 'clip') fetchClips()
}

const fetching = ref(false)
async function fetchVideos() {
  if (!detailItem.value) return
  system.loading()
  fetching.value = true
  try {
    const response = await AppBusiness.getUserVideosArchive(
      system.getAccountByType(detailItem.value.type),
      detailItem.value.id,
      system.videoOrder,
      videos.cursor,
      20
    )

    if (videos.cursor) videos.items.push(...response.items)
    else videos.items = response.items
    videos.cursor = response.cursor
  } finally {
    system.loaded()
    fetching.value = false
  }
}
async function fetchClips() {
  if (!detailItem.value) return
  system.loading()
  fetching.value = true
  try {
    const response = await AppBusiness.getUserClips(
      system.getAccountByType(detailItem.value.type),
      detailItem.value.id,
      system.clipPeriod,
      clips.cursor,
      20
    )

    if (clips.cursor) clips.items.push(...response.items)
    else clips.items = response.items
    clips.cursor = response.cursor
  } finally {
    system.loaded()
    fetching.value = false
  }
}

function showItem(item: StreamItemType) {
  return !detailItem.value || equals(detailItem.value, item)
}

function showCategoryNotificationDialog(item: StreamItemLiveType) {
  streamCategoryNotification.value = props.streams?.find((value) => equals(value, item))
}
</script>

<template>
  <v-list :accesskey="detailItem ? undefined : 'l'" class="bg-transparent py-0">
    <template v-for="(item, idx) in props.items" :key="`${keyListItem}:${item.type}:${item.id}`">
      <StreamListItem
        v-show="showItem(item)"
        v-model:detail-item="detailItem"
        v-model:menu-show="menuShow"
        :disable-category-menu="props.disableCategoryMenu"
        :disable-context-menu="props.disableContextMenu"
        :disable-notification-menu="props.disableNotificationMenu"
        :disable-view-count="props.disableViewCount"
        :disabled="!showItem(item)"
        :dump="props.dump"
        :item="item"
        :parent="props.parent"
        @item-click="itemClick"
        @menu-item-click="menuItemClick"
        @menu-item-category-notification-click="showCategoryNotificationDialog"
      />
      <v-divider v-if="idx !== props.items.length - 1 && !detailItem" />
    </template>
  </v-list>
  <CategoryNotificationDialog
    v-if="streamCategoryNotification && !!props.streams?.length"
    :model-value="!!streamCategoryNotification"
    :streams="props.streams"
    :stream-item="streamCategoryNotification"
    @update:model-value="streamCategoryNotification = $event ? streamCategoryNotification : undefined"
  />
  <template v-if="detailItem">
    <template v-if="detailType === 'video'">
      <h2 class="mt-2">{{ t('streamList.videos') }}</h2>
      <v-divider class="mt-1 mb-2" />
      <StreamList disable-context-menu :items="videos.items" :parent="detailItem" />
    </template>
    <template v-if="detailType === 'clip'">
      <h2 class="mt-2">{{ t('streamList.clips') }}</h2>
      <v-divider class="mt-1 mb-2" />
      <StreamList disable-context-menu :items="clips.items" :parent="detailItem" />
    </template>
    <v-btn
      v-if="hasMoreItems"
      block
      class="mt-2"
      :disabled="fetching"
      height="54"
      :loading="fetching"
      @click="fetchMore()"
    >
      <v-icon class="mr-2" size="x-large">mdi-magnify</v-icon>
      <span>{{ t('streamList.searchMore') }}</span>
    </v-btn>
  </template>
</template>

<style scoped lang="scss"></style>
