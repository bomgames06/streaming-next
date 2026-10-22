<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import emitter from '@/events'
import StreamOrderMenu from '@/components/listStream/StreamOrderMenu.vue'
import { mdiRefresh } from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()
</script>

<template>
  <v-text-field
    v-model.trim="system.streamFilterComp"
    accesskey="q"
    autofocus
    class="clearable-appbar"
    clearable
    color="primary"
    :label="t('streamView.filter')"
    persistent-clear
    variant="outlined"
  />
  <StreamOrderMenu />
  <v-btn
    :aria-label="t('common.refresh')"
    class="rounded-lg"
    :disabled="system.isRefreshing"
    :icon="true"
    :loading="system.isRefreshing"
    :size="system.appBarHeight"
    @click="emitter.emit('refresh')"
  >
    <v-icon :icon="mdiRefresh" />
  </v-btn>
</template>

<style scoped lang="scss"></style>
