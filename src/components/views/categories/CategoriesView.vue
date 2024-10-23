<script setup lang="ts">
import CategoriesList from '@/components/listCategories/CategoriesList.vue'
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { ViewDataStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import emitter from '@/events'
import { useI18n } from 'vue-i18n'
import { compact, uniqBy } from 'lodash'
import ViewContainer from '@/components/viewContainer/ViewContainer.vue'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<Pick<ViewDataStore, 'categoryId'>>()

const categories = reactive<{
  items: CategoryItemType[]
  cursor?: string
}>({
  items: [],
})
const categorySelected = ref<CategoryItemType>()
const categoryId = ref<string | undefined>(props.categoryId)
const categoryById = ref<CategoryItemType>()

watch(
  () => system.accounts.twitch,
  () => {
    if (!system.accounts.twitch) system.setView('streams')
  },
  { immediate: true }
)

emitter.on('refresh', refresh)
onUnmounted(() => {
  emitter.off('refresh', refresh)
})
onMounted(() => {
  if (categoryId.value) fetchCategory()
  else fetchCategories()
})

const items = computed<CategoryItemType[]>(() => uniqBy(compact([categoryById.value, ...categories.items]), 'id'))

async function fetchCategory() {
  if (!categoryId.value) return
  system.loading()
  try {
    const account = system.accounts.twitch
    if (!account) return

    const response = await AppBusiness.getCategoryById(account, categoryId.value)
    categoryById.value = response[0]
    void fetchCategories(categoryById.value)
  } finally {
    system.loaded()
  }
}

function refresh() {
  if (!categorySelected.value) {
    categories.cursor = undefined
    fetchCategories()
  }
}

const fetching = ref(false)
async function fetchCategories(category?: CategoryItemType) {
  system.loading()
  system.refreshing()
  fetching.value = true
  try {
    const account = system.accounts.twitch
    if (!account) return
    const response = await AppBusiness.getTopGamesCategory(account, categories.cursor, 99)

    if (categories.cursor) categories.items.push(...response.items)
    else categories.items = response.items
    categories.cursor = response.cursor

    if (category) categorySelected.value = category
  } finally {
    system.loaded()
    system.refreshed()
    fetching.value = false
  }
}

watch(categorySelected, () => {
  if (!categorySelected.value) {
    categoryId.value = undefined
    categoryById.value = undefined
  }
})
</script>

<template>
  <ViewContainer>
    <CategoriesList v-model:category-selected="categorySelected" :items="items" />
    <v-btn
      v-if="categories.cursor && !categorySelected"
      block
      class="mt-2"
      :disabled="fetching"
      height="54"
      :loading="fetching"
      @click="fetchCategories()"
    >
      <v-icon class="mr-2" size="x-large">mdi-magnify</v-icon>
      <span>{{ t('categoriesView.searchMore') }}</span>
    </v-btn>
  </ViewContainer>
</template>

<style scoped></style>
