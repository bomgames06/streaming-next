<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'

const system = useSystemStore()
const { t } = useI18n()

const mandatoryRule = (value: string) => !!value || t('common.mandatoryField')
</script>

<template>
  <v-text-field
    :model-value="system.streamNameFilter"
    variant="outlined"
    :label="t('searchView.search')"
    color="primary"
    autofocus
    single-line
    :rules="[mandatoryRule]"
    hide-details
    class="mr-2"
    @update:model-value="system.setStreamNameFilter(($event || '').trim())"
  />
</template>

<style scoped></style>
