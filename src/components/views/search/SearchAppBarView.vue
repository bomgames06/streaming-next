<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'

const system = useSystemStore()
const { t } = useI18n()

const mandatoryRule = (value: string) => !!value || t('common.mandatoryField')
</script>

<template>
  <v-text-field
    v-model.trim="system.streamNameFilter"
    autofocus
    class="mr-2 clearable-appbar"
    clearable
    color="primary"
    hide-details
    :label="t('searchView.search')"
    persistent-clear
    :rules="[mandatoryRule]"
    single-line
    variant="outlined"
  />
</template>

<style scoped></style>
