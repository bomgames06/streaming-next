<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useLegalLinks from '@/composables/useLegalLinks'

const { t } = useI18n()
const links = useLegalLinks()
</script>

<template>
  <i18n-t
    class="legal-notice text-body-small"
    data-testid="legal-notice"
    keypath="legal.authNotice"
    scope="global"
    tag="p"
  >
    <template v-for="link in links" :key="link.name" #[link.name]>
      <a class="text-primary" :href="link.url" rel="noopener" target="_blank">{{ t(`legal.${link.name}`) }}</a>
    </template>
  </i18n-t>
</template>

<style scoped lang="scss">
.legal-notice {
  max-width: 280px;
}
</style>
