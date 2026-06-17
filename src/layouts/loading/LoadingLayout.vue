<script setup lang="ts">
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import { useI18n } from 'vue-i18n'
import { mdiCheckBold, mdiCloseThick } from '@mdi/js'

const props = defineProps<{
  loaded?: boolean
  error?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <SimpleLayout>
    <v-row class="h-100 align-center justify-center">
      <v-col aria-live="polite" class="text-center" cols="auto">
        <h1 aria-atomic="true" class="text-primary">{{ t('common.projectName') }}</h1>
        <div class="d-flex align-center justify-center">
          <template v-if="props.error">
            <v-icon aria-hidden="true" class="mr-2" color="error" size="20" :icon="mdiCloseThick" />
            <span key="text" aria-atomic="true" class="text-error">{{ t('common.loadingError') }}</span>
          </template>
          <template v-else-if="props.loaded">
            <v-icon aria-hidden="true" class="mr-2" color="success" size="20" :icon="mdiCheckBold" />
            <span key="text" aria-atomic="true">{{ t('common.loaded') }}</span>
          </template>
          <template v-else>
            <v-progress-circular aria-hidden="true" class="mr-2" color="primary" indeterminate size="20" />
            <span key="text" aria-atomic="true">{{ t('common.loading') }}</span>
          </template>
        </div>
      </v-col>
    </v-row>
  </SimpleLayout>
</template>

<style scoped></style>
