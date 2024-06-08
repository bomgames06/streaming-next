<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'
import { onMounted, onUnmounted, ref } from 'vue'
import Mousetrap from 'mousetrap'
import { onKeyDownEsc } from '@/utils/util'

const system = useSystemStore()
const { t } = useI18n()

const filterTextFieldRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  Mousetrap.bind('alt+q', () => {
    if (filterTextFieldRef.value) filterTextFieldRef.value.focus()
  })
})
onUnmounted(() => {
  Mousetrap.unbind('alt+q')
})

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
    variant="outlined"
    :label="t('streamView.filter')"
    color="primary"
    autofocus
    single-line
    accesskey="q"
  />
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="true" :size="system.appBarHeight" :aria-label="t('common.sort')" class="rounded-lg">
        <v-icon>mdi-sort</v-icon>
      </v-btn>
    </template>
    <template #default="{ isActive }">
      <v-list class="pa-0" @keydown.prevent="onKeyDownEsc($event, () => (isActive.value = false))">
        <v-list-item
          :active="system.streamOrder === 'name'"
          :aria-selected="system.streamOrder === 'name'"
          :aria-label="sortLabelOption(t('streamView.appBarView.sort.name'), system.streamOrder === 'name')"
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
          :aria-label="sortLabelOption(t('streamView.appBarView.sort.view'), system.streamOrder === 'view')"
          role="option"
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
          :aria-label="sortLabelOption(t('streamView.appBarView.sort.game'), system.streamOrder === 'game')"
          role="option"
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
    </template>
  </v-menu>
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
