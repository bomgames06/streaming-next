<script setup lang="ts">
import type { LanguageCategoryStreamStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import emitter from '@/events'
import { useI18n } from 'vue-i18n'

const system = useSystemStore()
const { t } = useI18n()

const items: {
  value: LanguageCategoryStreamStore
  textI18n: string
}[] = [
  {
    value: 'pt',
    textI18n: 'categoriesList.appBarView.languages.portuguese',
  },
  {
    value: 'en',
    textI18n: 'categoriesList.appBarView.languages.english',
  },
  {
    value: 'ko',
    textI18n: 'categoriesList.appBarView.languages.korean',
  },
  {
    value: 'ja',
    textI18n: 'categoriesList.appBarView.languages.japanese',
  },
  {
    value: 'ru',
    textI18n: 'categoriesList.appBarView.languages.russian',
  },
  {
    value: 'zh',
    textI18n: 'categoriesList.appBarView.languages.chinese',
  },
]
</script>

<template>
  <v-select
    color="primary"
    :item-title="(value) => t(value.textI18n)"
    :items="items"
    :label="t('categoriesList.appBarView.language')"
    :model-value="system.languageCategoryStream"
    variant="outlined"
    multiple
    @update:model-value="system.setLanguageCategoryStream"
  >
    <template #selection="{ item, index }">
      <span v-if="index === 0">
        {{
          system.languageCategoryStream.length === 1
            ? item.title
            : t('categoriesList.appBarView.languagesSelected', { count: system.languageCategoryStream.length })
        }}
      </span>
    </template>
  </v-select>
  <v-btn
    :aria-label="t('common.refresh')"
    class="rounded-lg"
    :disabled="system.isRefreshing"
    :icon="true"
    :loading="system.isRefreshing"
    :size="system.appBarHeight"
    @click="emitter.emit('refresh')"
  >
    <v-icon>mdi-refresh</v-icon>
  </v-btn>
</template>

<style scoped lang="scss"></style>
