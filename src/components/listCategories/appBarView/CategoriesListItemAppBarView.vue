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
    :model-value="system.languageCategoryStream"
    :label="t('categoriesList.appBarView.language')"
    :items="items"
    :item-title="(value) => t(value.textI18n)"
    variant="outlined"
    color="primary"
    single-line
    clearable
    persistent-clear
    @update:model-value="system.setLanguageCategoryStream"
  />
  <v-btn
    :icon="true"
    :size="system.appBarHeight"
    :aria-label="t('common.refresh')"
    :disabled="system.isRefreshing"
    :loading="system.isRefreshing"
    class="rounded-lg"
    @click="emitter.emit('refresh')"
  >
    <v-icon>mdi-refresh</v-icon>
  </v-btn>
</template>

<style scoped lang="scss"></style>
