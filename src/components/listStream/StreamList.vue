<script setup lang="ts">
import type {
  StreamItemClipType,
  StreamItemType,
  StreamItemVideoType,
} from '@/components/listStream/types/streamItemType'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import browser from 'webextension-polyfill'
import { streamItemProfileUrl } from '@/utils/util'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import AppBusiness from '@/services/business/appBusiness'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<{
  items: StreamItemType[]
  disableContextMenu?: boolean
  disableCategoryMenu?: boolean
  disableNotificationMenu?: boolean
  dump?: string
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
    if (value.item.status === 'online' || value.item.status === 'offline')
      return void browser.tabs.create({ url: streamItemProfileUrl(value.item), active: !value.middle })
    if (value.item.status === 'video' || value.item.status === 'clip')
      return void browser.tabs.create({ url: value.item.url, active: !value.middle })
  }
}

watch(props.items, (items) => {
  if (!detailItem.value) return
  else detailItem.value = items.find((value) => equals(value, detailItem.value!))
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
  system.setClipPeriod('24h')
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
</script>

<template>
  <v-list class="bg-transparent py-0">
    <template v-for="(item, idx) in props.items" :key="`${item.type}:${item.id}`">
      <StreamListItem
        v-show="showItem(item)"
        v-model:detail-item="detailItem"
        v-model:menu-show="menuShow"
        :item="item"
        :disabled="!showItem(item)"
        :disable-context-menu="props.disableContextMenu"
        :disable-category-menu="props.disableCategoryMenu"
        :disable-notification-menu="props.disableNotificationMenu"
        :dump="props.dump"
        @item-click="itemClick"
        @menu-item-click="menuItemClick"
      />
      <v-divider v-if="idx !== props.items.length - 1 && !detailItem" />
    </template>
  </v-list>
  <template v-if="detailItem">
    <template v-if="detailType === 'video'">
      <h2 class="mt-2">{{ t('streamList.videos') }}</h2>
      <v-divider class="mt-1 mb-2" />
      <StreamList :items="videos.items" disable-context-menu />
    </template>
    <template v-if="detailType === 'clip'">
      <h2 class="mt-2">{{ t('streamList.clips') }}</h2>
      <v-divider class="mt-1 mb-2" />
      <StreamList :items="clips.items" disable-context-menu />
    </template>
    <v-btn
      v-if="hasMoreItems"
      :disabled="fetching"
      :loading="fetching"
      height="54"
      block
      class="mt-2"
      @click="fetchMore()"
    >
      <v-icon size="x-large" class="mr-2">mdi-magnify</v-icon>
      <span>{{ t('streamList.searchMore') }}</span>
    </v-btn>
  </template>
</template>

<style scoped lang="scss"></style>
