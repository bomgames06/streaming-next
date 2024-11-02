<script setup lang="ts">
import type { ClipPeriodStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'

const system = useSystemStore()
const { t } = useI18n()

const items: {
  value: ClipPeriodStore
  textI18n: string
}[] = [
  {
    value: '24h',
    textI18n: 'streamList.appBarView.clipPeriod.24h',
  },
  {
    value: '7d',
    textI18n: 'streamList.appBarView.clipPeriod.7d',
  },
  {
    value: '30d',
    textI18n: 'streamList.appBarView.clipPeriod.30d',
  },
  {
    value: 'all',
    textI18n: 'streamList.appBarView.clipPeriod.all',
  },
]
</script>

<template>
  <v-select
    class="mr-2"
    color="primary"
    :item-title="(value) => t(value.textI18n)"
    :items="items"
    :label="t('streamList.appBarView.filter')"
    :model-value="system.clipPeriod"
    single-line
    variant="outlined"
    @update:model-value="system.setClipPeriod($event || '24h')"
  />
</template>

<style scoped></style>
