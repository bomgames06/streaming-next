<script setup lang="ts">
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'
import type {
  CategorySearchItem,
  StreamItemLiveOnlineType,
  StreamItemType,
} from '@/components/listStream/types/streamItemType'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'
import { isEqual, uniqBy } from 'lodash'
import type { VMenu } from 'vuetify/components'
import type { VList } from 'vuetify/components/VList'
import { useTheme } from 'vuetify'
import { mdiBell, mdiBellOutline, mdiMagnify, mdiStar, mdiStarOutline } from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()
const theme = useTheme()

const menuShow = defineModel<CategoryItemType | CategorySearchItem | undefined>('menuShow')

const props = defineProps<{
  items: (CategoryItemType | CategorySearchItem)[]
  loading?: boolean
}>()

const id = crypto.randomUUID()
const width = 150
const height = width * (207 / 150)

const categorySelected = defineModel<CategoryItemType | CategorySearchItem>('categorySelected')

const detailItem = ref<StreamItemType>()
const streams = reactive<{
  items: StreamItemLiveOnlineType[]
  cursor?: string
}>({
  items: [],
})
const menu = reactive({
  x: 0,
  y: 0,
})
const listMenuRef = ref<InstanceType<typeof VList>>()
const categoryNotification = ref<CategoryItemType | CategorySearchItem>()

const streamItems = computed(() => uniqBy(streams.items, 'id'))

emitter.on('refresh', refresh)
onUnmounted(() => {
  emitter.off('refresh', refresh)
})

function refresh() {
  if (categorySelected.value) {
    streams.cursor = undefined
    fetchStreams()
  }
}

const gridTemplateRow = computed(() => (categorySelected.value ? '1fr' : '1fr 1fr 1fr'))

function categoryImg(item: CategoryItemType | CategorySearchItem): string {
  if ('boxArtUrl' in item)
    return item.boxArtUrl.replace('{width}', width.toFixed()).replace('{height}', height.toFixed())
  return item.imageUrl.replace(/\d+x\d+/, `${width.toFixed()}x${height.toFixed()}`)
}

function clickCategory(item: CategoryItemType | CategorySearchItem) {
  if (categorySelected.value?.id === item.id) {
    categorySelected.value = undefined
    system.setHeaderAppBarView(undefined)
  } else {
    system.setLanguageCategoryStream([])
    categorySelected.value = item
    streams.items = []
  }
}

watch(
  () => system.languageCategoryStream,
  (value, oldValue) => {
    if (isEqual(value, oldValue)) return
    streams.cursor = undefined
    streams.items = []
    fetchStreams()
  }
)

watch(categorySelected, () => {
  nextTick(() => {
    fetchStreams()
  })
})

const fetching = ref(false)
async function fetchStreams() {
  if (!categorySelected.value) return
  system.loading()
  system.refreshing()
  fetching.value = true
  try {
    const response = await AppBusiness.getStreamsByCategory(
      system.getAccountByType(categorySelected.value.type),
      categorySelected.value.id,
      system.languageCategoryStream,
      streams.cursor,
      20
    )

    if (streams.cursor) streams.items.push(...response.items)
    else streams.items = response.items
    streams.cursor = response.cursor
  } finally {
    system.loaded()
    system.refreshed()
    fetching.value = false
  }
}

watch([categorySelected, detailItem], () => {
  if (!categorySelected.value) return void system.setHeaderAppBarView(undefined)
  else if (!detailItem.value)
    return void nextTick(() => {
      system.setHeaderAppBarView('categoryStreams')
    })
})

function showItem(category: CategoryItemType | CategorySearchItem) {
  return !categorySelected.value || categorySelected.value.id === category.id
}

function categoryElId(category: CategoryItemType | CategorySearchItem) {
  return `${id}:${category.id}`
}

async function showMenu(event: PointerEvent, item: CategoryItemType | CategorySearchItem): Promise<void> {
  if (categorySelected.value) return
  menu.x = event.clientX
  menu.y = event.clientY
  menuShow.value = item
}
async function closeMenu(value?: boolean): Promise<void> {
  let item = menuShow.value
  if (!value) menuShow.value = undefined

  await nextTick()
  if (!menuShow.value && item) {
    const element = document.getElementById(categoryElId(item))
    element && element.focus()
  }
}

function addFavoriteCategory(item: CategoryItemType | CategorySearchItem): void {
  system.addFavoriteCategory({
    type: item.type,
    id: item.id,
    name: item.name,
  })
}
function removeFavoriteCategory(item: CategoryItemType | CategorySearchItem): void {
  system.removeFavoriteCategory({
    type: item.type,
    id: item.id,
    name: item.name,
  })
}
function favoriteEnabled(item: CategoryItemType | CategorySearchItem): boolean {
  return system.categoryFavorites.some((favorite) => favorite.type === item.type && favorite.name === item.name)
}
function notificationEnabled(item: CategoryItemType | CategorySearchItem): boolean {
  return system.categoryNotifications.some((notification) => notification.name === item.name)
}
function notificationHasStream(item: CategoryItemType | CategorySearchItem): boolean {
  return !!system.categoryNotifications.find((notification) => notification.name === item.name)?.streams.length
}

function showCategoryNotificationDialog(item: CategoryItemType | CategorySearchItem) {
  categoryNotification.value = item
}
</script>

<template>
  <v-list v-if="props.items.length" class="bg-transparent category-list py-0">
    <v-list-item
      v-for="category in props.items"
      v-show="showItem(category)"
      :id="categoryElId(category)"
      :key="category.id"
      class="pa-0"
      :disabled="!showItem(category)"
      tabindex="0"
      @click="clickCategory(category)"
      @contextmenu.prevent="showMenu($event, category)"
    >
      <v-tooltip activator="parent" location="bottom" :text="categorySelected ? t('common.back') : category.name" />
      <div class="pa-1">
        <v-card
          :class="{
            'category-item-card': true,
            'd-flex': true,
            'flex-column': !categorySelected,
          }"
          elevation="1"
          height="100%"
        >
          <div class="position-relative">
            <v-img :max-width="categorySelected && 108" :src="categoryImg(category)" :width="categorySelected && 108" />
            <div class="badge-content">
              <v-card
                v-if="notificationEnabled(category)"
                :aria-label="t('common.notification')"
                class="bg-background badge-item position-relative"
              >
                <v-icon
                  :color="theme.current.value.dark ? 'yellow' : 'warning'"
                  size="x-small"
                  :icon="mdiBell"
                  :class="{
                    'diagonal-cut': notificationHasStream(category),
                  }"
                />
                <v-icon
                  :color="theme.current.value.dark ? 'yellow' : 'warning'"
                  size="x-small"
                  :icon="mdiBellOutline"
                  class="position-absolute bell-notification-position"
                />
              </v-card>
              <v-card
                v-if="favoriteEnabled(category)"
                :aria-label="t('common.favorite')"
                class="bg-background badge-item"
              >
                <v-icon :color="theme.current.value.dark ? 'yellow' : 'warning'" size="x-small" :icon="mdiStar" />
              </v-card>
            </div>
          </div>
          <p
            :class="{
              'text-truncate': !categorySelected,
              'text-body-small': !categorySelected,
              'text-headline-small': !!categorySelected,
              'ml-2': !!categorySelected,
              'line-height-normal': true,
              'font-weight-black': true,
              'category-item-title': true,
              'my-0': true,
              'mt-1': true,
            }"
          >
            {{ category.name }}
          </p>
        </v-card>
      </div>
    </v-list-item>
  </v-list>
  <v-row v-else density="compact" class="h-100 align-center justify-center">
    <v-col v-if="props.loading" cols="auto" class="text-center">
      <v-progress-circular color="primary" indeterminate />
    </v-col>
    <v-col v-else cols="auto" class="text-center">
      {{ t('categoriesList.noItems') }}
    </v-col>
  </v-row>
  <v-menu
    v-if="!categorySelected && menuShow"
    :model-value="!!menuShow"
    :target="[menu.x, menu.y]"
    @close="closeMenu()"
    @update:model-value="closeMenu"
    @keydown.esc.prevent="closeMenu()"
  >
    <v-list :id="listMenuRef" @keydown.esc.prevent="closeMenu()">
      <v-list-item
        :prepend-icon="favoriteEnabled(menuShow) ? mdiStar : mdiStarOutline"
        :title="
          favoriteEnabled(menuShow) ? t('categoriesList.menu.removeFavorite') : t('categoriesList.menu.addFavorite')
        "
        @click="favoriteEnabled(menuShow) ? removeFavoriteCategory(menuShow) : addFavoriteCategory(menuShow)"
      />
      <v-list-item
        v-if="system.notificationType !== 'none'"
        :prepend-icon="mdiBell"
        :title="t('streamList.menu.categoryNotification')"
        @click="showCategoryNotificationDialog(menuShow)"
      />
    </v-list>
  </v-menu>
  <CategoryNotificationDialog
    v-if="categoryNotification"
    :model-value="!!categoryNotification"
    :category-item="categoryNotification"
    @update:model-value="categoryNotification = $event ? categoryNotification : undefined"
  />
  <div v-if="categorySelected" class="mt-3">
    <StreamList v-model:detail-item="detailItem" disable-category-menu disable-notification-menu :items="streamItems" />
    <v-btn
      v-if="streams.cursor && !detailItem"
      block
      class="mt-2"
      :disabled="fetching"
      height="54"
      :loading="fetching"
      @click="fetchStreams()"
    >
      <v-icon class="mr-2" size="x-large" :icon="mdiMagnify" />
      <span>{{ t('categoriesList.searchMore') }}</span>
    </v-btn>
  </div>
</template>

<style scoped lang="scss">
.category-list {
  display: grid;
  grid-template-columns: v-bind(gridTemplateRow);
  gap: 6px;

  ::v-deep(.v-list-item__content) {
    height: 100%;
  }
}
.category-item-card {
  padding: 4px;
}
.category-item-title {
  max-height: 149px;
}
.badge-item {
  padding: 2px;
  line-height: 1;
  font-size: 12px !important;
}
.badge-content {
  display: flex;
  gap: 2px;
  position: absolute;
  top: 0;
  right: 0;
  margin: 1px;
}
.bell-notification-position {
  left: 2px;
}
</style>
