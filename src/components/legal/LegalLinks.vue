<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useLegalLinks from '@/composables/useLegalLinks'

const { t } = useI18n()
const links = useLegalLinks()
</script>

<template>
  <nav class="d-flex align-center justify-center flex-wrap ga-2" data-testid="legal-links">
    <a v-for="link in links" :key="link.name" class="text-primary" :href="link.url" rel="noopener" target="_blank">
      {{ t(`legal.${link.name}`) }}
    </a>
  </nav>
</template>
