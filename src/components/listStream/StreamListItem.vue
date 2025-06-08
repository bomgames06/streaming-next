<script setup lang="ts">
import type { StreamItemLiveType, StreamItemType } from '@/components/listStream/types/streamItemType'
import { isOfflineStream, isStream } from '@/components/listStream/types/streamItemType'
import { useI18n } from 'vue-i18n'
import useMoment from '@/plugins/moment/useMoment'
import useSystemStore from '@/store/system/useSystemStore'
import { useTheme } from 'vuetify'
import { has } from 'lodash'
import type { Duration } from 'moment/moment'
import { accountTypeColor } from '@/utils/util'
import { v4 as uuidV4 } from 'uuid'

const aspectRatio = 16 / 9
const imageWidth = 290
const previewWidth = 90

const system = useSystemStore()
const { t, locale } = useI18n()
const moment = useMoment()
const theme = useTheme()

const props = defineProps<{
  item: StreamItemType
  disabled?: boolean
  disableContextMenu?: boolean
  disableCategoryMenu?: boolean
  disableNotificationMenu?: boolean
  disableViewCount?: boolean
  dump?: string
  parent?: StreamItemType
}>()
const emit = defineEmits<{
  (e: 'itemClick', value: { item: StreamItemType; middle?: boolean }): void
  (e: 'menuItemClick', value: { type: 'video' | 'clip'; item: StreamItemType }): void
  (e: 'menuItemCategoryNotificationClick', value: StreamItemLiveType): void
  (e: 'menuItemGroupStreamClick', value: StreamItemLiveType): void
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
      ? item.value.previewImage(imageWidth, imageWidth * (1 / aspectRatio), props.dump)
      : item.value.previewImage
  if (item.value.type === 'twitch' && item.value.status === 'clip' && item.value.previewImage)
    return item.value.previewImage
  return ''
})
const spectatorsCount = computed<number | undefined>(() => {
  if (item.value.status === 'online' || item.value.status === 'video' || item.value.status === 'clip')
    return item.value.viewerCount ?? 0
  return undefined
})
const spectatorsText = computed(() => {
  if (spectatorsCount.value)
    return `${spectatorsCount.value.toLocaleString(locale.value)} ${t('streamList.spectators', spectatorsCount.value)}`

  return ''
})
const notificationEnabled = computed(() =>
  system.notifications.some((value) => value.type === item.value.type && value.id === item.value.id)
)
const favoriteEnabled = computed(() =>
  system.favorites.some((value) => value.type === item.value.type && value.id === item.value.id)
)
const dataDiff = computed(() => {
  let duration: Duration | undefined

  if (item.value.status === 'video' || item.value.status === 'clip')
    duration = moment.value.duration(moment.value(system.timer).diff(item.value.createdAt))

  if (duration) return duration.format('y __ w __ d __ h __ m __ s __', { largest: 1 })
  return ''
})

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
  if (detailItem.value || props.disableContextMenu) return
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
function categoryNotification(item: StreamItemLiveType) {
  emit('menuItemCategoryNotificationClick', item)
}
function groupStream(item: StreamItemLiveType) {
  emit('menuItemGroupStreamClick', item)
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

function isVerified(value?: StreamItemType): boolean {
  if (!value) return false

  if (isStream(value)) return value.verified

  return false
}
</script>

<template>
  <div v-intersect="onIntersect" class="content-size">
    <link v-if="previewImage" :href="previewImage" rel="prefetch" tabindex="-1" />
    <link v-if="isOfflineStream(item) && item.profileImage" :href="item.profileImage" rel="prefetch" tabindex="-1" />
    <v-hover v-slot="{ props: hoverProps, isHovering }">
      <v-tooltip :disabled="!detailItem" location="bottom" :text="t('common.back')">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="hoverProps">
            <v-list-item
              v-bind="tooltipProps"
              :id="id"
              class="px-1 list-item"
              :disabled="props.disabled"
              height="64"
              @click.prevent="emit('itemClick', { item: props.item, middle: false })"
              @contextmenu.prevent="showMenu"
              @focusin="focusedItem = true"
              @focusout="focusedItem = false"
              @mousedown.middle.prevent="emit('itemClick', { item: props.item, middle: true })"
            >
              <template v-if="itemIntersected" #prepend>
                <template v-if="item.status === 'online' || item.status === 'video' || item.status === 'clip'">
                  <div class="mr-2 position-relative">
                    <v-img
                      :alt="t('streamList.streamerPreview', { name: item.name })"
                      :aspect-ratio="aspectRatio"
                      cover
                      :src="previewImage"
                      :width="previewWidth"
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
                    <div class="badge-content">
                      <v-card
                        v-if="item.status === 'online' && system.notificationType === 'partial' && notificationEnabled"
                        class="bg-background badge-item"
                      >
                        <v-icon
                          aria-hidden="false"
                          :aria-label="t('common.notification')"
                          :color="theme.current.value.dark ? 'yellow' : 'warning'"
                          size="x-small"
                          >mdi-bell</v-icon
                        >
                      </v-card>
                      <v-card v-if="item.status === 'online' && favoriteEnabled" class="bg-background badge-item">
                        <v-icon
                          aria-hidden="false"
                          :aria-label="t('common.favorite')"
                          :color="theme.current.value.dark ? 'yellow' : 'warning'"
                          size="x-small"
                          >mdi-star</v-icon
                        >
                      </v-card>
                    </div>
                  </div>
                </template>
                <div v-if="isOfflineStream(item)" class="mr-2 position-relative">
                  <v-img
                    :alt="t('streamList.streamerProfile', { name: item.name })"
                    :aspect-ratio="aspectRatio"
                    cover
                    :src="item.profileImage"
                    :width="previewWidth"
                  />
                  <div class="badge-content">
                    <v-card
                      v-if="system.notificationType === 'partial' && notificationEnabled"
                      class="bg-background badge-item"
                    >
                      <v-icon
                        aria-hidden="false"
                        :aria-label="t('common.notification')"
                        :color="theme.current.value.dark ? 'yellow' : 'warning'"
                        size="x-small"
                        >mdi-bell</v-icon
                      >
                    </v-card>
                    <v-card v-if="favoriteEnabled" class="bg-background badge-item">
                      <v-icon
                        aria-hidden="false"
                        :aria-label="t('common.favorite')"
                        :color="theme.current.value.dark ? 'yellow' : 'warning'"
                        size="x-small"
                        >mdi-star</v-icon
                      >
                    </v-card>
                  </div>
                </div>
              </template>
              <template v-if="itemIntersected" #default>
                <v-menu
                  v-if="isLiveType(item)"
                  :model-value="!!menuShow && equals(menuShow, item)"
                  :target="[menu.x, menu.y]"
                  @close="closeMenu()"
                  @update:model-value="closeMenu"
                >
                  <v-list :id="contextMenuListId" @keydown.esc.prevent="menuShow = undefined">
                    <v-list-item
                      v-if="!props.disableNotificationMenu"
                      :prepend-icon="favoriteEnabled ? 'mdi-star' : 'mdi-star-outline'"
                      :title="favoriteEnabled ? t('streamList.menu.removeFavorite') : t('streamList.menu.addFavorite')"
                      @click="
                        favoriteEnabled
                          ? system.removeFavorite(item.type, item.id)
                          : system.addFavorite(item.type, item.id)
                      "
                    />
                    <v-list-item
                      v-if="
                        system.notificationType === 'partial' &&
                        !props.disableNotificationMenu &&
                        item.type === 'twitch'
                      "
                      :prepend-icon="notificationEnabled ? 'mdi-bell' : 'mdi-bell-outline'"
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
                      v-if="
                        system.notificationType !== 'none' && !props.disableNotificationMenu && item.type === 'twitch'
                      "
                      :title="t('streamList.menu.categoryNotification')"
                      @click="categoryNotification(item)"
                    >
                      <template #prepend>
                        <v-badge color="surface" location="bottom end">
                          <template #badge>
                            <v-icon size="large">mdi-controller</v-icon>
                          </template>
                          <v-icon>mdi-bell</v-icon>
                        </v-badge>
                      </template>
                    </v-list-item>
                    <v-list-item
                      v-if="
                        system.notificationType !== 'none' && !props.disableNotificationMenu && item.type === 'twitch'
                      "
                      :title="t('streamList.menu.groupStream')"
                      @click="groupStream(item)"
                    >
                      <template #prepend>
                        <v-badge color="surface" location="bottom end">
                          <template #badge>
                            <v-icon size="large">mdi-plus</v-icon>
                          </template>
                          <v-icon>mdi-folder</v-icon>
                        </v-badge>
                      </template>
                    </v-list-item>
                    <v-list-item
                      v-if="
                        !props.disableCategoryMenu && item.status === 'online' && item.gameId && item.type === 'twitch'
                      "
                      prepend-icon="mdi-controller"
                      :title="t('streamList.menu.category')"
                      @click="system.setView('categories', { categoryId: item.gameId })"
                    />
                    <v-list-item
                      v-if="item.type === 'twitch'"
                      prepend-icon="mdi-video"
                      :title="t('streamList.menu.videos')"
                      @click="enableVideo()"
                    />
                    <v-list-item
                      v-if="item.type === 'twitch'"
                      prepend-icon="mdi-movie-open-star"
                      :title="t('streamList.menu.clips')"
                      @click="enableClip()"
                    />
                  </v-list>
                </v-menu>
                <v-list-item-title class="line-height-normal d-flex align-center" :title="item.name">
                  <div
                    :class="`d-inline-flex text-truncate align-center text-body-2 line-height-normal font-weight-black ${accountTypeColor(item.type, false, true)}`"
                  >
                    <v-icon v-if="item.type === 'twitch'" class="text-body-1" :color="accountTypeColor('twitch')">
                      mdi-twitch
                    </v-icon>
                    <v-icon v-if="item.type === 'youtube'" class="text-body-1" :color="accountTypeColor('youtube')">
                      mdi-youtube
                    </v-icon>
                    <span class="mx-1 overflow-hidden text-truncate">{{ item.name }}</span>
                    <v-icon v-if="isVerified(item) || isVerified(props.parent)" class="text-body-2">
                      mdi-check-decagram
                    </v-icon>
                  </div>
                  <v-spacer />
                  <div
                    v-if="spectatorsCount != undefined && !props.disableViewCount"
                    class="d-inline text-caption line-height-normal text-medium-emphasis font-weight-bold ml-1"
                  >
                    <span :aria-label="spectatorsText" class="text-red">
                      <v-icon class="text-body-2">mdi-account</v-icon>
                      {{ spectatorsCount.toLocaleString(locale) }}
                    </span>
                  </div>
                </v-list-item-title>
                <template v-if="isOfflineStream(item)">
                  <v-list-item-subtitle class="text-caption line-height-normal font-weight-bold">{{
                    t('streamList.offline')
                  }}</v-list-item-subtitle>
                </template>
                <template v-if="item.status === 'online' || item.status === 'video' || item.status === 'clip'">
                  <v-list-item-subtitle
                    v-if="item.status === 'online' && item.type === 'twitch' && item.game"
                    class="text-caption line-height-normal font-weight-bold"
                    :title="item.game"
                    >{{ item.game }}</v-list-item-subtitle
                  >
                  <v-list-item-subtitle
                    v-if="item.title"
                    class="text-caption line-height-normal font-weight-bold"
                    :title="item.title"
                    >{{ item.title }}</v-list-item-subtitle
                  >
                </template>
                <template v-if="item.status === 'video' || item.status === 'clip'">
                  <v-list-item-subtitle
                    v-if="dataDiff"
                    class="text-caption line-height-normal font-weight-bold"
                    :title="dataDiff"
                    >{{ dataDiff }}</v-list-item-subtitle
                  >
                </template>
              </template>
            </v-list-item>
          </div>
        </template>
      </v-tooltip>
    </v-hover>
  </div>
</template>

<style scoped lang="scss">
.list-item {
  ::v-deep(.v-list-item__content) {
    align-self: start;
  }
  ::v-deep(.v-list-item-subtitle) {
    max-height: 15px;
  }
}
.content-size {
  height: 64px;
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
.badge-content {
  display: flex;
  gap: 2px;
  position: absolute;
  top: 0;
  right: 0;
  margin: 1px;
}
.badge-item {
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
