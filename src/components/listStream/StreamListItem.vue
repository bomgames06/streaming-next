<script setup lang="ts">
import type { StreamItemLiveType, StreamItemType } from '@/components/listStream/types/streamItemType'
import { computed, nextTick, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import useMoment from '@/plugins/moment/useMoment'
import useSystemStore from '@/store/system/useSystemStore'
import { useTheme } from 'vuetify'
import { has } from 'lodash'
import type { Duration } from 'moment/moment'
import { accountTypeColor, onKeyDownEsc } from '@/utils/util'
import { v4 as uuidV4 } from 'uuid'

const system = useSystemStore()
const { t, locale } = useI18n()
const moment = useMoment()
const theme = useTheme()

const props = defineProps<{
  item: StreamItemType
  disabled?: boolean
  disableContextMenu?: boolean
  disableCategoryMenu?: boolean
  disableFavoriteMenu?: boolean
  showDivider?: boolean
  dump?: string
}>()
const emit = defineEmits<{
  (e: 'itemClick', value: { item: StreamItemType; middle?: boolean }): void
  (e: 'menuItemClick', value: { type: 'video' | 'clip'; item: StreamItemType }): void
}>()
const detailItem = defineModel<StreamItemType | undefined>('detailItem')
const menuShow = defineModel<StreamItemType | undefined>('menuShow')

const menu = reactive({
  x: 0,
  y: 0,
})
const focusedItem = ref<boolean>(false)
const id = uuidV4()
const contextMenuListId = uuidV4()
const itemIntersected = ref<boolean>(false)

const item = computed(() => props.item)
const previewImage = computed(() => {
  if ((item.value.status === 'online' || item.value.status === 'video') && item.value.previewImage)
    return typeof item.value.previewImage === 'function'
      ? item.value.previewImage(290, 290 * (1 / aspectRatio), props.dump)
      : item.value.previewImage
  if (item.value.type === 'twitch' && item.value.status === 'clip' && item.value.previewImage)
    return item.value.previewImage
  return ''
})
const spectatorsText = computed(() => {
  if (
    (item.value.status === 'online' || item.value.status === 'video' || item.value.status === 'clip') &&
    item.value.viewerCount != undefined
  )
    return `${item.value.viewerCount.toLocaleString(locale.value)} ${t('streamList.spectators', item.value.viewerCount)}`
  return ''
})
const notificationEnabled = computed(() =>
  system.notifications.some((value) => value.type === item.value.type && value.id === item.value.id)
)
const dataDiff = computed(() => {
  let duration: Duration | undefined

  if (item.value.status === 'video' || item.value.status === 'clip')
    duration = moment.value.duration(moment.value(system.timer).diff(item.value.createdAt))

  if (duration) return duration.format('y __ w __ d __ h __ m __ s __', { largest: 1 })
  return ''
})

const aspectRatio = 16 / 9
const previewWidth = 90

function equals(a: StreamItemType, b: StreamItemType) {
  return a.type === b.type && a.id === b.id
}

function formatStreamDuration(value: StreamItemType) {
  if (value.status === 'online' && value.type === 'twitch' && value.startedAt)
    return moment.value.duration(moment.value(system.timer).diff(value.startedAt)).format('hh:mm:ss', { trim: false })
  if (value.status === 'video' && value.duration)
    return moment.value.duration(value.duration, 'seconds').format('hh:mm:ss', { trim: false })
  if (value.status === 'clip' && value.duration) return `${value.duration.toFixed()}s`
  return ''
}

async function showMenu(event: PointerEvent) {
  if (detailItem.value || props.disableContextMenu || item.value.type !== 'twitch') return
  menu.x = event.clientX
  menu.y = event.clientY
  menuShow.value = item.value

  await nextTick()
  const element = document.getElementById(contextMenuListId)
  if (element) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) (entry.target as HTMLElement).focus()
      },
      { threshold: [0] }
    )
    observer.observe(element)
  }
}

function isLiveType(value: StreamItemType): value is StreamItemLiveType {
  return has(value, 'status') && !!value.status
}

function enableDetail() {
  detailItem.value = item.value
}

function enableVideo() {
  if (item.value.type !== 'twitch') return
  enableDetail()
  emit('menuItemClick', { type: 'video', item: item.value })
}
function enableClip() {
  if (item.value.type !== 'twitch') return
  enableDetail()
  emit('menuItemClick', { type: 'clip', item: item.value })
}

async function closeMenu(value?: boolean) {
  if (!value) menuShow.value = undefined

  await nextTick()
  if (!menuShow.value) {
    const element = document.getElementById(id)
    element && element.focus()
  }
}

function onIntersect(isIntersecting: boolean) {
  itemIntersected.value = isIntersecting
}
</script>

<template>
  <div v-intersect="onIntersect" class="content-size">
    <link v-if="previewImage" rel="preload" :href="previewImage" as="image" />
    <link v-if="item.status === 'offline' && item.profileImage" rel="preload" :href="item.profileImage" as="image" />
    <template v-if="itemIntersected">
      <v-hover v-slot="{ props: hoverProps, isHovering }">
        <v-list-item
          v-bind="hoverProps"
          :id="id"
          :disabled="props.disabled"
          class="px-1 list-item"
          height="64"
          @click.prevent="emit('itemClick', { item: props.item, middle: false })"
          @mousedown.middle.prevent="emit('itemClick', { item: props.item, middle: true })"
          @contextmenu.prevent="showMenu"
          @focusin="focusedItem = true"
          @focusout="focusedItem = false"
        >
          <v-tooltip :disabled="!detailItem" activator="parent" :text="t('common.back')" location="bottom" />
          <v-menu
            v-if="isLiveType(item) && item.type === 'twitch'"
            :model-value="!!menuShow && equals(menuShow, item)"
            :target="[menu.x, menu.y]"
            @close="closeMenu()"
            @update:model-value="closeMenu"
          >
            <v-list :id="contextMenuListId" @keydown.prevent="onKeyDownEsc($event, () => (menuShow = undefined))">
              <v-list-item
                v-if="system.notificationType === 'partial' && !props.disableFavoriteMenu"
                :prepend-icon="notificationEnabled ? 'mdi-star' : 'mdi-star-outline'"
                :title="
                  notificationEnabled
                    ? t('streamList.menu.disableNotification')
                    : t('streamList.menu.enableNotification')
                "
                @click="
                  notificationEnabled
                    ? system.removeNotification(item.type, item.id)
                    : system.addNotification(item.type, item.id)
                "
              />
              <v-list-item
                v-if="!props.disableCategoryMenu"
                prepend-icon="mdi-controller"
                :title="t('streamList.menu.category')"
                @click="
                  system.setView('categories', { categoryId: item.status === 'online' ? item.gameId : undefined })
                "
              />
              <v-list-item prepend-icon="mdi-video" :title="t('streamList.menu.videos')" @click="enableVideo()" />
              <v-list-item
                prepend-icon="mdi-movie-open-star"
                :title="t('streamList.menu.clips')"
                @click="enableClip()"
              />
            </v-list>
          </v-menu>
          <template #prepend>
            <template v-if="item.status === 'online' || item.status === 'video' || item.status === 'clip'">
              <div class="mr-2 position-relative">
                <v-img
                  :src="previewImage"
                  :aspect-ratio="aspectRatio"
                  :width="previewWidth"
                  cover
                  :alt="t('streamList.streamerPreview', { name: item.name })"
                />
                <v-card
                  v-if="isHovering || focusedItem || item.status === 'video' || item.status === 'clip'"
                  class="start-at-content text-caption bg-background"
                >
                  {{
                    isHovering || focusedItem || item.status === 'video' || item.status === 'clip'
                      ? formatStreamDuration(item)
                      : null
                  }}
                </v-card>
                <v-card
                  v-if="item.status === 'online' && notificationEnabled"
                  class="notification-content text-caption bg-background"
                >
                  <v-icon
                    :color="theme.current.value.dark ? 'yellow' : 'warning'"
                    :aria-label="t('common.favorite')"
                    aria-hidden="false"
                    size="x-small"
                    >mdi-star</v-icon
                  >
                </v-card>
              </div>
            </template>
            <div v-if="item.status === 'offline'" class="mr-2 position-relative">
              <v-img
                :src="item.profileImage"
                :aspect-ratio="aspectRatio"
                :width="previewWidth"
                cover
                :alt="t('streamList.streamerProfile', { name: item.name })"
              />
              <v-card v-if="notificationEnabled" class="notification-content text-caption bg-background">
                <v-icon
                  :color="theme.current.value.dark ? 'yellow' : 'warning'"
                  :aria-label="t('common.favorite')"
                  aria-hidden="false"
                  size="x-small"
                  >mdi-star</v-icon
                >
              </v-card>
            </div>
          </template>
          <v-list-item-title :title="spectatorsText" class="line-height-normal">
            <v-icon v-if="item.type === 'twitch'" :color="accountTypeColor('twitch')" size="x-small" class="mr-1"
              >mdi-twitch</v-icon
            >
            <div
              :class="`d-inline text-body-2 line-height-normal font-weight-black ${accountTypeColor(item.type, false, true)}`"
            >
              {{ item.name }}
            </div>
            <div
              v-if="(item.status === 'online' || item.status === 'video' || item.status === 'clip') && spectatorsText"
              class="d-inline text-caption line-height-normal text-medium-emphasis font-weight-bold"
            >
              <span aria-hidden="true"> - </span>
              <span> {{ spectatorsText }} </span>
            </div>
          </v-list-item-title>
          <template v-if="item.status === 'offline'">
            <v-list-item-subtitle class="text-caption line-height-normal font-weight-bold">{{
              t('streamList.offline')
            }}</v-list-item-subtitle>
          </template>
          <template v-if="item.status === 'online' || item.status === 'video' || item.status === 'clip'">
            <v-list-item-subtitle
              v-if="item.status === 'online' && item.type === 'twitch' && item.game"
              :title="item.game"
              class="text-caption line-height-normal font-weight-bold"
              >{{ item.game }}</v-list-item-subtitle
            >
            <v-list-item-subtitle
              v-if="item.title"
              :title="item.title"
              class="text-caption line-height-normal font-weight-bold"
              >{{ item.title }}</v-list-item-subtitle
            >
          </template>
          <template v-if="item.status === 'video' || item.status === 'clip'">
            <v-list-item-subtitle
              v-if="dataDiff"
              :title="dataDiff"
              class="text-caption line-height-normal font-weight-bold"
              >{{ dataDiff }}</v-list-item-subtitle
            >
          </template>
        </v-list-item>
      </v-hover>
      <v-divider v-if="props.showDivider" class="my-1" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.list-item {
  ::v-deep(.v-list-item__content) {
    align-self: start;
  }
}
.content-size {
  height: 69px;
}
.line-height-normal {
  line-height: 1.33;
}
.start-at-content {
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 1px;
  padding: 2px 4px;
  line-height: 1;
  font-size: 10px !important;
}
.notification-content {
  position: absolute;
  top: 0;
  right: 0;
  margin: 1px;
  padding: 2px;
  line-height: 1;
  font-size: 10px !important;
}
.account-type-content {
  position: absolute;
  top: 0;
  left: 0;
  margin: 1px;
  padding: 2px;
  line-height: 1;
  font-size: 10px !important;
}
</style>
