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

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<{
  items: (CategoryItemType | CategorySearchItem)[]
}>()

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
</script>

<template>
  <v-list class="bg-transparent category-list py-0">
    <v-list-item
      v-for="category in props.items"
      v-show="showItem(category)"
      :key="category.id"
      class="pa-0"
      :disabled="!showItem(category)"
      @click="clickCategory(category)"
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
          <v-img :max-width="categorySelected && 108" :src="categoryImg(category)" :width="categorySelected && 108" />
          <p
            :class="{
              'text-truncate': !categorySelected,
              'text-caption': !categorySelected,
              'text-h6': !!categorySelected,
              'ml-2': !!categorySelected,
              'line-height-normal': true,
              'font-weight-black': true,
              'category-item-title': true,
            }"
          >
            {{ category.name }}
          </p>
        </v-card>
      </div>
    </v-list-item>
  </v-list>
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
      <v-icon class="mr-2" size="x-large">mdi-magnify</v-icon>
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
</style>
