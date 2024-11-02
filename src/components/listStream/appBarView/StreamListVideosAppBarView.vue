<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import { onKeyDownEsc } from '@/utils/util'

const system = useSystemStore()
const { t } = useI18n()
</script>

<template>
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :aria-label="t('common.sort')" class="rounded-lg" :icon="true" :size="system.appBarHeight">
        <v-icon>mdi-sort</v-icon>
      </v-btn>
    </template>
    <template #default="{ isActive }">
      <v-list class="pa-0" @keydown.prevent="onKeyDownEsc($event, () => (isActive.value = false))">
        <v-list-item
          :active="system.videoOrder === 'time'"
          :aria-label="t('streamList.appBarView.sort.time')"
          :aria-selected="system.videoOrder === 'time'"
          class="pa-0 stream-order-item rounded-0"
          height="42"
          role="option"
          width="42"
          @click="system.setVideoOrder('time')"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large">mdi-calendar</v-icon>
          </div>
        </v-list-item>
        <v-list-item
          :active="system.videoOrder === 'trending'"
          :aria-label="t('streamList.appBarView.sort.trending')"
          :aria-selected="system.videoOrder === 'trending'"
          class="pa-0 stream-order-item rounded-0"
          height="42"
          role="option"
          width="42"
          @click="system.setVideoOrder('trending')"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large">mdi-star</v-icon>
          </div>
        </v-list-item>
        <v-list-item
          :active="system.videoOrder === 'views'"
          :aria-label="t('streamList.appBarView.sort.views')"
          :aria-selected="system.videoOrder === 'views'"
          class="pa-0 stream-order-item rounded-0"
          height="42"
          role="option"
          width="42"
          @click="system.setVideoOrder('views')"
        >
          <div class="h-100 d-flex align-center justify-center position-relative">
            <v-icon size="x-large">mdi-account-eye</v-icon>
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
</style>
