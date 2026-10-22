<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import type { StreamOrderStore } from '@/store/system/types/systemStoreType'
import {
  mdiAccountEye,
  mdiArrowDownThick,
  mdiArrowUpThick,
  mdiController,
  mdiOrderAlphabeticalAscending,
  mdiSort,
} from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const options: { value: StreamOrderStore; icon: string; textI18n: string }[] = [
  { value: 'name', icon: mdiOrderAlphabeticalAscending, textI18n: 'streamView.appBarView.sort.name' },
  { value: 'view', icon: mdiAccountEye, textI18n: 'streamView.appBarView.sort.view' },
  { value: 'game', icon: mdiController, textI18n: 'streamView.appBarView.sort.game' },
]

function sortLabelOption(text: string, selected: boolean) {
  let value = text
  if (selected) value += ` - ${system.streamOrderSort ? t('common.asc') : t('common.desc')}`
  return value
}
</script>

<template>
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :aria-label="t('common.sort')" class="rounded-lg" :icon="true" :size="system.appBarHeight">
        <v-icon :icon="mdiSort" />
      </v-btn>
    </template>
    <template #default="{ isActive }">
      <v-list class="pa-0" @keydown.esc.prevent="isActive.value = false">
        <v-list-item
          v-for="option in options"
          :key="option.value"
          :active="system.streamOrder === option.value"
          :aria-label="sortLabelOption(t(option.textI18n), system.streamOrder === option.value)"
          :aria-selected="system.streamOrder === option.value"
          class="pa-0 stream-order-item rounded-0"
          :data-testid="`stream-order-${option.value}`"
          height="42"
          role="option"
          width="42"
          @click="system.setStreamOrder(option.value)"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large" :icon="option.icon" />
            <v-icon v-if="system.streamOrder === option.value" class="stream-order-item-asc rounded-circle" size="12">
              {{ system.streamOrderSort ? mdiArrowUpThick : mdiArrowDownThick }}
            </v-icon>
          </div>
        </v-list-item>
      </v-list>
    </template>
  </v-menu>
</template>

<style scoped lang="scss">
.stream-order-item {
  ::v-deep(.v-list-item__content) {
    height: 100%;
  }
}
.stream-order-item-asc {
  position: absolute;
  top: 0;
  right: 0;
  margin: 4px;
  background-color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  color: rgba(var(--v-theme-surface));
}
</style>
