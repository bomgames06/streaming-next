<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'

const system = useSystemStore()
const { t } = useI18n()
</script>

<template>
  <v-text-field
    :model-value="system.streamFilter"
    variant="outlined"
    :label="t('streamView.filter')"
    color="primary"
    autofocus
    single-line
    @update:model-value="system.setStreamFilter(($event || '').trim())"
  />
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="true" :size="system.appBarHeight" class="rounded-lg">
        <v-icon>mdi-sort</v-icon>
      </v-btn>
    </template>
    <v-list class="pa-0">
      <v-list-item
        :active="system.streamOrder === 'name'"
        role="option"
        height="42"
        width="42"
        class="pa-0 stream-order-item rounded-0"
        @click="system.setStreamOrder('name')"
      >
        <div class="h-100 d-flex align-center justify-center position-relative">
          <v-icon size="x-large">mdi-order-alphabetical-ascending</v-icon>
          <v-icon v-if="system.streamOrder === 'name'" size="12" class="stream-order-item-asc rounded-circle">
            {{ system.streamOrderSort ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick' }}
          </v-icon>
        </div>
      </v-list-item>
      <v-list-item
        :active="system.streamOrder === 'view'"
        height="42"
        width="42"
        class="pa-0 stream-order-item rounded-0"
        @click="system.setStreamOrder('view')"
      >
        <div class="h-100 d-flex align-center justify-center position-relative">
          <v-icon size="x-large">mdi-account-eye</v-icon>
          <v-icon v-if="system.streamOrder === 'view'" size="12" class="stream-order-item-asc rounded-circle">
            {{ system.streamOrderSort ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick' }}
          </v-icon>
        </div>
      </v-list-item>
      <v-list-item
        :active="system.streamOrder === 'game'"
        height="42"
        width="42"
        class="pa-0 stream-order-item rounded-0"
        @click="system.setStreamOrder('game')"
      >
        <div class="h-100 d-flex align-center justify-center position-relative">
          <v-icon size="x-large">mdi-controller</v-icon>
          <v-icon v-if="system.streamOrder === 'game'" size="12" class="stream-order-item-asc rounded-circle">
            {{ system.streamOrderSort ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick' }}
          </v-icon>
        </div>
      </v-list-item>
    </v-list>
  </v-menu>
  <v-btn :icon="true" :size="system.appBarHeight" class="rounded-lg" @click="emitter.emit('refresh')">
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
