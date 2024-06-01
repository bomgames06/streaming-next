<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'
import { onMounted, onUnmounted, ref } from 'vue'
import Mousetrap from 'mousetrap'

const system = useSystemStore()
const { t } = useI18n()

const filterTextFieldRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  Mousetrap.bind('alt+s', () => {
    if (filterTextFieldRef.value) filterTextFieldRef.value.focus()
  })
})
onUnmounted(() => {
  Mousetrap.unbind('alt+s')
})
</script>

<template>
  <v-text-field
    ref="filterTextFieldRef"
    v-model.trim="system.streamFilterComp"
    variant="outlined"
    :label="t('streamView.filter')"
    color="primary"
    autofocus
    single-line
  />
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="true" :size="system.appBarHeight" :aria-label="t('common.sort')" class="rounded-lg">
        <v-icon>mdi-sort</v-icon>
      </v-btn>
    </template>
    <v-list class="pa-0">
      <v-list-item
        :active="system.streamOrder === 'name'"
        :aria-selected="system.streamOrder === 'name'"
        :aria-sort="system.streamOrder === 'name' ? (system.streamOrderSort ? 'ascending' : 'descending') : ''"
        :aria-label="t('streamView.appBarView.sort.name')"
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
        :aria-selected="system.streamOrder === 'view'"
        :aria-sort="system.streamOrder === 'view' ? (system.streamOrderSort ? 'ascending' : 'descending') : ''"
        :aria-label="t('streamView.appBarView.sort.view')"
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
        :aria-selected="system.streamOrder === 'game'"
        :aria-sort="system.streamOrder === 'game' ? (system.streamOrderSort ? 'ascending' : 'descending') : ''"
        :aria-label="t('streamView.appBarView.sort.game')"
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
  <v-btn
    :icon="true"
    :size="system.appBarHeight"
    :aria-label="t('common.refresh')"
    class="rounded-lg"
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
