<script setup lang="ts">
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  loaded?: boolean
  error?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <SimpleLayout>
    <v-row align="center" justify="center" class="h-100">
      <v-col cols="auto" aria-live="polite" class="text-center">
        <h1 aria-atomic="true" class="text-primary">{{ t('common.projectName') }}</h1>
        <div class="d-flex justify-center">
          <template v-if="props.error">
            <v-icon aria-hidden="true" color="error" size="20" class="mr-2">mdi-close-thick</v-icon>
            <p key="text" aria-atomic="true" class="text-error">{{ t('common.loadingError') }}</p>
          </template>
          <template v-else-if="props.loaded">
            <v-icon aria-hidden="true" color="success" size="20" class="mr-2">mdi-check-bold</v-icon>
            <p key="text" aria-atomic="true">{{ t('common.loaded') }}</p>
          </template>
          <template v-else>
            <v-progress-circular aria-hidden="true" indeterminate color="primary" size="20" class="mr-2" />
            <p key="text" aria-atomic="true">{{ t('common.loading') }}</p>
          </template>
        </div>
      </v-col>
    </v-row>
  </SimpleLayout>
</template>

<style scoped></style>
