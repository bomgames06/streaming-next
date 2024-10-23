<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import emitter from '@/events'
import { useI18n } from 'vue-i18n'

const system = useSystemStore()
const { t } = useI18n()
</script>

<template>
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

<style scoped lang="scss"></style>
