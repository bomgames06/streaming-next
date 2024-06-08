<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { v4 as uuidV4 } from 'uuid'

const { t } = useI18n()

const idContent = uuidV4()

const expanded = ref<boolean>(false)
</script>

<template>
  <div class="d-flex flex-column">
    <v-btn
      block
      variant="flat"
      height="20"
      :aria-label="expanded ? t('menuExpansion.hideMenu') : t('menuExpansion.showMenu')"
      :aria-controls="idContent"
      :aria-expanded="expanded"
      class="rounded-t-0 order-3"
      @click="expanded = !expanded"
    >
      <v-icon>{{ expanded ? 'mdi-menu-up' : 'mdi-menu-down' }}</v-icon>
    </v-btn>
    <v-sheet v-show="expanded" :id="idContent" :aria-label="t('menuExpansion.menuContent')" class="py-1 px-3 order-1">
      <slot />
    </v-sheet>
    <v-divider v-show="expanded" class="order-2" />
  </div>
</template>

<style scoped lang="scss">
.order-1 {
  order: 1;
}
.order-2 {
  order: 2;
}
.order-3 {
  order: 3;
}
</style>
