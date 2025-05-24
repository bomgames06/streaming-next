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
    <v-row align="center" class="h-100" justify="center">
      <v-col aria-live="polite" class="text-center" cols="auto">
        <h1 aria-atomic="true" class="text-primary">{{ t('common.projectName') }}</h1>
        <div class="d-flex justify-center">
          <template v-if="props.error">
            <v-icon aria-hidden="true" class="mr-2" color="error" size="20" :icon="mdiCloseThick" />
            <p key="text" aria-atomic="true" class="text-error">{{ t('common.loadingError') }}</p>
          </template>
          <template v-else-if="props.loaded">
            <v-icon aria-hidden="true" class="mr-2" color="success" size="20" :icon="mdiCheckBold" />
            <p key="text" aria-atomic="true">{{ t('common.loaded') }}</p>
          </template>
          <template v-else>
            <v-progress-circular aria-hidden="true" class="mr-2" color="primary" indeterminate size="20" />
            <p key="text" aria-atomic="true">{{ t('common.loading') }}</p>
          </template>
        </div>
      </v-col>
    </v-row>
  </SimpleLayout>
</template>

<style scoped></style>
