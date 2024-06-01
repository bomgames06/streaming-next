<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'

const system = useSystemStore()
</script>

<template>
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="true" :size="system.appBarHeight" class="rounded-lg">
        <v-icon>mdi-sort</v-icon>
      </v-btn>
    </template>
    <v-list class="pa-0">
      <v-list-item
        :active="system.videoOrder === 'time'"
        role="option"
        height="42"
        width="42"
        class="pa-0 stream-order-item rounded-0"
        @click="system.setVideoOrder('time')"
      >
        <div class="h-100 d-flex align-center justify-center position-relative">
          <v-icon size="x-large">mdi-calendar</v-icon>
        </div>
      </v-list-item>
      <v-list-item
        :active="system.videoOrder === 'trending'"
        height="42"
        width="42"
        class="pa-0 stream-order-item rounded-0"
        @click="system.setVideoOrder('trending')"
      >
        <div class="h-100 d-flex align-center justify-center position-relative">
          <v-icon size="x-large">mdi-star</v-icon>
        </div>
      </v-list-item>
      <v-list-item
        :active="system.videoOrder === 'views'"
        height="42"
        width="42"
        class="pa-0 stream-order-item rounded-0"
        @click="system.setVideoOrder('views')"
      >
        <div class="h-100 d-flex align-center justify-center position-relative">
          <v-icon size="x-large">mdi-account-eye</v-icon>
        </div>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<style scoped lang="scss">
.stream-order-item {
  ::v-deep(.v-list-item__content) {
    height: 100%;
  }
}
</style>
