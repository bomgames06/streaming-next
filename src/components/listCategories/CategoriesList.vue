<script setup lang="ts">
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import type { StreamItemLiveOnlineType, StreamItemType } from '@/components/listStream/types/streamItemType'
import StreamList from '@/components/listStream/StreamList.vue'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<{
  items: CategoryItemType[]
}>()

const width = 150
const height = width * (207 / 150)

const categorySelected = defineModel<CategoryItemType>('categorySelected')

const detailItem = ref<StreamItemType>()
const streams = reactive<{
  items: StreamItemLiveOnlineType[]
  cursor?: string
}>({
  items: [],
})

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

function categoryImg(item: CategoryItemType): string {
  return item.boxArtUrl.replace('{width}', width.toFixed()).replace('{height}', height.toFixed())
}

function clickCategory(item: CategoryItemType) {
  if (categorySelected.value?.id === item.id) {
    categorySelected.value = undefined
    system.setHeaderAppBarView(undefined)
  } else {
    system.setLanguageCategoryStream(undefined)
    categorySelected.value = item
    streams.items = []
  }
}

watch(
  () => system.languageCategoryStream,
  () => {
    streams.cursor = undefined
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
</script>

<template>
  <v-list class="bg-transparent category-list py-0">
    <v-list-item
      v-for="category in props.items"
      v-show="!categorySelected || categorySelected.id === category.id"
      :key="category.id"
      class="pa-0"
      @click="clickCategory(category)"
    >
      <v-card
        height="100%"
        :class="{
          'category-item-card': true,
          'd-flex': true,
          'flex-column': !categorySelected,
        }"
      >
        <v-img :src="categoryImg(category)" :width="categorySelected && 108" :max-width="categorySelected && 108" />
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
    </v-list-item>
  </v-list>
  <div v-if="categorySelected" class="mt-3">
    <StreamList v-model:detail-item="detailItem" :items="streams.items" disable-category-menu />
    <v-btn
      v-if="streams.cursor && !detailItem"
      :disabled="fetching"
      :loading="fetching"
      height="54"
      block
      class="mt-2"
      @click="fetchStreams()"
    >
      <v-icon size="x-large" class="mr-2">mdi-magnify</v-icon>
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
