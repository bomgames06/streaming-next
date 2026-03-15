<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import emitter from '@/events'
import { useI18n } from 'vue-i18n'
import { mdiRefresh } from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()
</script>

<template>
  <v-text-field
    v-model.trim="system.categoryNameFilterComp"
    autofocus
    class="clearable-appbar"
    clearable
    color="primary"
    hide-details
    :label="t('categoriesView.appBarView.filter')"
    persistent-clear
    variant="outlined"
  />
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
