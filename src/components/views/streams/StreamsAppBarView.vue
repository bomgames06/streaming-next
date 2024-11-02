<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'
import { onKeyDownEsc } from '@/utils/util'

const system = useSystemStore()
const { t } = useI18n()

const filterTextFieldRef = ref<HTMLInputElement | null>(null)

function sortLabelOption(text: string, selected: boolean) {
  let value = text
  if (selected) value += ` - ${system.streamOrderSort ? t('common.asc') : t('common.desc')}`
  return value
}
</script>

<template>
  <v-text-field
    ref="filterTextFieldRef"
    v-model.trim="system.streamFilterComp"
    accesskey="q"
    autofocus
    class="clearable-appbar"
    clearable
    color="primary"
    :label="t('streamView.filter')"
    persistent-clear
    single-line
    variant="outlined"
  />
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :aria-label="t('common.sort')" class="rounded-lg" :icon="true" :size="system.appBarHeight">
        <v-icon>mdi-sort</v-icon>
      </v-btn>
    </template>
    <template #default="{ isActive }">
      <v-list class="pa-0" @keydown.prevent="onKeyDownEsc($event, () => (isActive.value = false))">
        <v-list-item
          :active="system.streamOrder === 'name'"
          :aria-label="sortLabelOption(t('streamView.appBarView.sort.name'), system.streamOrder === 'name')"
          :aria-selected="system.streamOrder === 'name'"
          class="pa-0 stream-order-item rounded-0"
          height="42"
          role="option"
          width="42"
          @click="system.setStreamOrder('name')"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large">mdi-order-alphabetical-ascending</v-icon>
            <v-icon v-if="system.streamOrder === 'name'" class="stream-order-item-asc rounded-circle" size="12">
              {{ system.streamOrderSort ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick' }}
            </v-icon>
          </div>
        </v-list-item>
        <v-list-item
          :active="system.streamOrder === 'view'"
          :aria-label="sortLabelOption(t('streamView.appBarView.sort.view'), system.streamOrder === 'view')"
          :aria-selected="system.streamOrder === 'view'"
          class="pa-0 stream-order-item rounded-0"
          height="42"
          role="option"
          width="42"
          @click="system.setStreamOrder('view')"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large">mdi-account-eye</v-icon>
            <v-icon v-if="system.streamOrder === 'view'" class="stream-order-item-asc rounded-circle" size="12">
              {{ system.streamOrderSort ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick' }}
            </v-icon>
          </div>
        </v-list-item>
        <v-list-item
          :active="system.streamOrder === 'game'"
          :aria-label="sortLabelOption(t('streamView.appBarView.sort.game'), system.streamOrder === 'game')"
          :aria-selected="system.streamOrder === 'game'"
          class="pa-0 stream-order-item rounded-0"
          height="42"
          role="option"
          width="42"
          @click="system.setStreamOrder('game')"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large">mdi-controller</v-icon>
            <v-icon v-if="system.streamOrder === 'game'" class="stream-order-item-asc rounded-circle" size="12">
              {{ system.streamOrderSort ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick' }}
            </v-icon>
          </div>
        </v-list-item>
      </v-list>
    </template>
  </v-menu>
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
