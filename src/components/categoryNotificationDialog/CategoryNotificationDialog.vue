<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import type { CategorySearchItem, StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'
import { compact, debounce, orderBy, trim, uniqBy, upperCase } from 'lodash'
import type { CategoryNotificationStore } from '@/store/system/types/systemStoreType'

const { t } = useI18n()

const model = defineModel<boolean | undefined>()
const props = defineProps<{
  streams: StreamItemLiveStreamType[]
}>()

const system = useSystemStore()

const imageRatio = 52 / 72

const category = ref<string | CategorySearchItem>('')
const search = ref<string>('')
const fetching = ref<boolean>(false)
const menu = ref<boolean>(false)
const categories = ref<CategorySearchItem[]>([])
const categoryAddStream = ref<CategoryNotificationStore>()
const stream = ref<StreamItemLiveStreamType>()

const categoryComp = computed({
  get: () => category.value,
  set: (value) => {
    if (!value) category.value = ''
    else category.value = value
  },
})
const categoryItems = computed(() => orderBy(categories.value, 'name'))
const streams = computed(() => orderBy(props.streams, 'name'))

watch(model, () => {
  category.value = ''
  categories.value = []
  categoryAddStream.value = undefined
  stream.value = undefined
})
watch(search, debounce(fetchCategories, 500))
watch([category, categories], () => {
  const rawCategory = toRaw(category.value)
  if (typeof rawCategory !== 'object') {
    const item = categories.value.find((item) => upperCase(item.name) === upperCase(rawCategory))
    if (item) category.value = item
  }
})

async function fetchCategories() {
  if (!search.value) {
    categories.value = []
    return
  }

  try {
    fetching.value = true

    const responses = await Promise.all(
      system.validAccounts.map((account) => AppBusiness.searchCategories(account, search.value, undefined, 100))
    )

    const items: CategorySearchItem[] = []
    responses.forEach((response) => items.push(...response.items))

    categories.value = uniqBy(items, 'name')
  } finally {
    fetching.value = false
  }
}

function addCategory() {
  if (!category.value) return
  const rawCategory = toRaw(category.value)

  if (typeof rawCategory === 'object') system.addCategoryNotification(rawCategory.name, rawCategory.imageUrl)
  else system.addCategoryNotification(rawCategory)

  category.value = ''
}

async function openAddStream(categoryNotification: CategoryNotificationStore) {
  categoryAddStream.value = categoryNotification
  stream.value = undefined
  await nextTick()

  document.getElementById(`autocomplete-${categoryNotification.id}`)?.focus()
}

function addStream(category: CategoryNotificationStore, streamItem?: StreamItemLiveStreamType) {
  if (!streamItem) return

  system.addStreamCategoryNotification(category.id, streamItem.type, streamItem.id)

  categoryAddStream.value = undefined
  stream.value = undefined
}

function getStreamListFromCategory(category: CategoryNotificationStore): StreamItemLiveStreamType[] {
  return compact(
    category.streams.map((itemStreamCategory) =>
      props.streams.find(
        (itemStream) => itemStream.type === itemStreamCategory.type && itemStream.id === itemStreamCategory.id
      )
    )
  )
}
</script>

<template>
  <v-dialog v-model="model" eager height="100%" @keydown.esc.prevent="model = false">
    <template #activator="activatorValue">
      <slot name="activator" v-bind="activatorValue" />
    </template>
    <template #default="{ isActive }">
      <v-card :title="t('gameNotificationDialog.title')">
        <v-card-text class="d-flex flex-column overflow-y-auto pb-1">
          <v-row dense class="flex-nowrap flex-grow-0">
            <v-col>
              <v-combobox
                v-model="categoryComp"
                v-model:menu="menu"
                :items="categoryItems"
                item-title="name"
                item-value="name"
                :label="t('categoryNotificationDialog.category')"
                variant="outlined"
                density="compact"
                :loading="fetching"
                :menu-props="{
                  location: 'bottom',
                  origin: 'top',
                  maxHeight: '275px',
                }"
                no-filter
                item-props
                autofocus
                class="mt-2"
                @update:search="search = trim($event)"
                @keydown.esc.prevent="menu ? (menu = false) : (isActive.value = false)"
              >
                <template #item="{ item, props: itemComboboxProps }">
                  <v-list-item v-bind="itemComboboxProps" @keydown.esc.prevent="menu = false">
                    <template #prepend>
                      <v-img :src="item.props.imageUrl" width="32" class="mr-2" />
                    </template>
                  </v-list-item>
                </template>
              </v-combobox>
            </v-col>
            <v-col cols="auto">
              <div class="pt-2 h-100">
                <v-btn :disabled="!category" height="100%" min-width="0" class="px-2" @click="addCategory()">
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </v-col>
          </v-row>
          <v-list v-if="system.categoryNotifications.length" dense class="flex-grow-1 overflow-y-auto mt-2">
            <v-list-group
              v-for="categoryNotification in system.categoryNotifications"
              :key="categoryNotification.id"
              fluid
            >
              <template #activator="{ props: itemListGroupProps }">
                <v-list-item
                  v-bind="itemListGroupProps"
                  :title="categoryNotification.name"
                  :subtitle="
                    t(
                      'categoryNotificationDialog.streamCount',
                      {
                        count: categoryNotification.streams.length,
                      },
                      categoryNotification.streams.length
                    )
                  "
                  lines="two"
                  density="compact"
                >
                  <template #prepend>
                    <div class="mr-2">
                      <v-img
                        v-if="categoryNotification.imageUrl"
                        :src="categoryNotification.imageUrl"
                        :aspect-ratio="imageRatio"
                        width="30"
                      />
                      <v-sheet v-else color="surface-light" class="d-flex align-center justify-center h-100">
                        <v-icon>mdi-camera-off</v-icon>
                      </v-sheet>
                    </div>
                  </template>
                  <template #append>
                    <v-btn
                      icon
                      size="x-small"
                      variant="flat"
                      @click="system.removeCategoryNotification(categoryNotification.id)"
                    >
                      <v-icon size="large" color="error">mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </template>
              <v-list-item
                v-if="categoryAddStream?.id !== categoryNotification.id"
                :title="t('categoryNotificationDialog.addStream')"
                prepend-icon="mdi-plus"
                class="px-2"
                @click="openAddStream(categoryNotification)"
              />
              <v-list-item v-else>
                <v-row dense class="flex-nowrap">
                  <v-col>
                    <v-autocomplete
                      :id="`autocomplete-${categoryNotification.id}`"
                      v-model="stream"
                      :items="streams"
                      :item-value="(item) => `${item.type}:${item.id}`"
                      item-title="name"
                      :label="t('categoryNotificationDialog.stream')"
                      density="compact"
                      variant="outlined"
                      return-object
                      class="my-2"
                    >
                      <template #item="{ item, props: itemAutocompleteProps }">
                        <v-list-item v-bind="itemAutocompleteProps">
                          <template #prepend>
                            <v-avatar size="small" :image="item.raw.profileImage" />
                          </template>
                        </v-list-item>
                      </template>
                    </v-autocomplete>
                  </v-col>
                  <v-col cols="auto">
                    <div class="py-2 h-100">
                      <v-btn
                        :disabled="!stream"
                        height="100%"
                        min-width="0"
                        class="px-2"
                        @click="addStream(categoryAddStream, stream)"
                      >
                        <v-icon>mdi-plus</v-icon>
                      </v-btn>
                    </div>
                  </v-col>
                  <v-col cols="auto">
                    <div class="py-2 h-100">
                      <v-btn height="100%" min-width="0" class="px-2" @click="categoryAddStream = undefined">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-list-item>
              <v-list-item
                v-for="streamItem in getStreamListFromCategory(categoryNotification)"
                :key="streamItem.id"
                dense
                :title="streamItem.name"
                class="stream-category-content"
              >
                <template #prepend>
                  <v-avatar size="small" :image="streamItem.profileImage" />
                </template>
                <template #append>
                  <v-btn
                    icon
                    size="x-small"
                    variant="flat"
                    @click="
                      system.removeStreamCategoryNotification(categoryNotification.id, streamItem.type, streamItem.id)
                    "
                  >
                    <v-icon size="large" color="error">mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list-group>
          </v-list>
          <v-sheet v-else class="flex-grow-1 d-flex align-center justify-center">
            {{ t('categoryNotificationDialog.noNotifications') }}
          </v-sheet>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :text="t('common.close')" @click="isActive.value = false" />
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<style scoped lang="scss">
.category-image-content {
  width: 43px;
}
.stream-category-content {
  padding-inline-start: 32px !important;
}
</style>
