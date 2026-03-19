<script setup lang="ts">
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'
import type { ViewDataStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import emitter from '@/events'
import { useI18n } from 'vue-i18n'
import { compact, debounce, orderBy, sortBy, uniqBy } from 'lodash'
import type { CategorySearchItem } from '@/components/listStream/types/streamItemType'
import { mdiBell, mdiBellOutline, mdiController, mdiFilter, mdiMagnify, mdiStar, mdiStarOutline } from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<Pick<ViewDataStore, 'categoryId'>>()

system.categoryNameFilterComp = ''

const categories = reactive<{
  items: (CategoryItemType | CategorySearchItem)[]
  cursor?: string
}>({
  items: [],
})
const favoriteItems = ref<CategoryItemType[]>([])
const notificationItems = ref<CategoryItemType[]>([])
const categorySelected = ref<CategoryItemType | CategorySearchItem>()
const categoryId = ref<string | undefined>(props.categoryId)
const categoryById = ref<CategoryItemType>()
const firstLoading = ref<boolean>(true)

emitter.on('refresh', refresh)
onUnmounted(() => {
  emitter.off('refresh', refresh)
})
onMounted(() => {
  if (categoryId.value) fetchCategory()
  else fetchCategories()
})

const favoriteNotificationFilter = computed<boolean>(
  () => system.showCategoryFavoritesComp || system.showCategoryNotificationsComp
)
const items = computed<(CategoryItemType | CategorySearchItem)[]>(() =>
  uniqBy(compact([categoryById.value, ...categories.items]), 'id')
)
const categoriesComp = computed<(CategoryItemType | CategorySearchItem)[]>(() => {
  let value: (CategoryItemType | CategorySearchItem)[] = []

  if (system.showCategoryFavoritesComp) value.push(...favoriteItems.value)
  if (system.showCategoryNotificationsComp) value.push(...notificationItems.value)

  if (categorySelected.value || !favoriteNotificationFilter.value) value.push(...items.value)
  else if (!categorySelected.value && favoriteNotificationFilter && system.categoryNameFilterComp)
    value = value.filter((item) => item.name.toLowerCase().includes(system.categoryNameFilterComp.toLowerCase()))

  return uniqBy(value, 'id')
})

watch(
  () => system.accounts.twitch,
  () => {
    if (!system.accounts.twitch) system.setView('streams')
  },
  { immediate: true }
)
watch(
  () => system.categoryNameFilterComp,
  debounce(() => fetchCategories(), 500)
)

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
async function fetchCategories(category?: CategoryItemType): Promise<void> {
  if (!favoriteNotificationFilter.value) {
    system.loading()
    system.refreshing()
  }
  fetching.value = true
  try {
    await Promise.all([fetchItemsCategories(category), fetchCategoryFavorites(), fetchCategoryNotifcations()])
  } finally {
    if (!favoriteNotificationFilter.value) {
      system.loaded()
      system.refreshed()
    }
    fetching.value = false
    firstLoading.value = false
  }
}
async function fetchItemsCategories(category?: CategoryItemType): Promise<void> {
  const account = system.accounts.twitch
  if (!account) return

  if (system.categoryNameFilterComp) {
    const response = await AppBusiness.searchCategories(account, system.categoryNameFilterComp, undefined, 99)

    categories.items = orderBy(response.items, ['name'])
    categories.cursor = undefined
  } else {
    const response = await AppBusiness.getTopGamesCategory(account, categories.cursor, 99)

    if (categories.cursor) categories.items.push(...response.items)
    else categories.items = response.items
    categories.cursor = response.cursor
  }

  if (category) categorySelected.value = category
}
async function fetchCategoryFavorites(): Promise<void> {
  if (!system.categoryFavorites.length) {
    favoriteItems.value = []
    return
  }

  const account = system.accounts.twitch
  if (!account) return

  favoriteItems.value = sortBy(
    await AppBusiness.fetchCategoriesByNames(
      account,
      system.categoryFavorites.map((value) => value.name)
    ),
    'name'
  )
}
async function fetchCategoryNotifcations(): Promise<void> {
  if (!system.categoryNotifications.length) {
    notificationItems.value = []
    return
  }

  const account = system.accounts.twitch
  if (!account) return

  notificationItems.value = sortBy(
    await AppBusiness.fetchCategoriesByNames(
      account,
      system.categoryNotifications.map((value) => value.name)
    ),
    'name'
  )
}

watch(categorySelected, () => {
  if (!categorySelected.value) {
    categoryId.value = undefined
    categoryById.value = undefined
  }
})
watch(
  () => system.categoryFavorites,
  () => {
    fetchCategoryFavorites()
  }
)
watch(
  () => system.categoryNotifications,
  () => {
    fetchCategoryNotifcations()
  }
)

function toggleFavoriteCategory() {
  system.showCategoryFavoritesComp = !system.showCategoryFavoritesComp
}
function toggleNotificationCategory() {
  system.showCategoryNotificationsComp = !system.showCategoryNotificationsComp
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
                  v-tooltip="t('common.favorite', 2)"
                  accesskey="b"
                  :aria-checked="system.showCategoryFavoritesComp"
                  :aria-label="t('common.favorite', 2)"
                  class="rounded-lg"
                  :disabled="!!categorySelected"
                  :icon="true"
                  role="checkbox"
                  size="24"
                  @click="toggleFavoriteCategory"
                >
                  <v-icon :color="system.showCategoryFavoritesComp ? 'primary' : ''" size="18">
                    {{ system.showCategoryFavoritesComp ? mdiStar : mdiStarOutline }}
                  </v-icon>
                </v-btn>
              </v-col>
              <v-col cols="auto">
                <v-btn
                  v-tooltip="t('common.notification', 2)"
                  accesskey="b"
                  :aria-checked="system.showCategoryNotificationsComp"
                  :aria-label="t('common.notification', 2)"
                  class="rounded-lg"
                  :disabled="!!categorySelected"
                  :icon="true"
                  role="checkbox"
                  size="24"
                  @click="toggleNotificationCategory"
                >
                  <v-icon :color="system.showCategoryNotificationsComp ? 'primary' : ''" size="18">
                    {{ system.showCategoryNotificationsComp ? mdiBell : mdiBellOutline }}
                  </v-icon>
                </v-btn>
              </v-col>
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
                <CategoryNotificationDialog>
                  <template #activator="{ props: categoryNotificationDialogProps }">
                    <v-btn
                      v-tooltip:start="t('streamsView.category')"
                      v-bind="categoryNotificationDialogProps"
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
    </template>
    <CategoriesList v-model:category-selected="categorySelected" :items="categoriesComp" :loading="firstLoading" />
    <v-btn
      v-if="
        categories.cursor &&
        !categorySelected &&
        !system.showCategoryFavoritesComp &&
        !system.showCategoryNotificationsComp
      "
      block
      class="mt-2"
      :disabled="fetching"
      height="54"
      :loading="fetching"
      @click="fetchCategories()"
    >
      <v-icon class="mr-2" size="x-large" :icon="mdiMagnify" />
      <span>{{ t('categoriesView.searchMore') }}</span>
    </v-btn>
  </ViewContainer>
</template>

<style lang="scss" scoped>
.filter-content {
  z-index: 10;
}
</style>
