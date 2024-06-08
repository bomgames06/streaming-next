<script setup lang="ts">
import type { ViewStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'

const sidebar = defineModel<boolean>('sidebar')

const system = useSystemStore()
const { t } = useI18n()

function setView(view: ViewStore) {
  system.setView(view)
  sidebar.value = false
}
</script>

<template>
  <v-list
    :selected="[system.view]"
    mandatory
    nav
    color="primary"
    class="list-content"
    @update:selected="setView($event[0])"
  >
    <v-list-item
      role="option"
      :value="'streams' as ViewStore"
      :aria-selected="system.view === 'streams'"
      :aria-label="t('views.streams')"
      accesskey="1"
    >
      <v-tooltip activator="parent" :text="t('views.streams')" location="end" />
      <v-icon>mdi-format-list-text</v-icon>
    </v-list-item>
    <v-list-item
      v-if="system.accounts.twitch && !system.accounts.twitch.invalid"
      role="option"
      :value="'categories' as ViewStore"
      :aria-selected="system.view === 'categories'"
      :aria-label="t('views.categories')"
      accesskey="2"
    >
      <v-tooltip activator="parent" :text="t('views.categories')" location="end" />
      <v-icon>mdi-controller</v-icon>
    </v-list-item>
    <v-list-item
      v-if="system.accounts.twitch && !system.accounts.twitch.invalid"
      role="option"
      :value="'search' as ViewStore"
      :aria-selected="system.view === 'search'"
      :aria-label="t('views.search')"
      accesskey="3"
    >
      <v-tooltip activator="parent" :text="t('views.search')" location="end" />
      <v-icon>mdi-magnify</v-icon>
    </v-list-item>
    <v-spacer />
    <v-list-item
      role="option"
      :value="'settings' as ViewStore"
      :aria-selected="system.view === 'settings'"
      :aria-label="t('views.settings')"
      accesskey="s"
    >
      <v-tooltip activator="parent" :text="t('views.settings')" location="end" />
      <v-icon>mdi-cog</v-icon>
    </v-list-item>
  </v-list>
</template>

<style scoped lang="scss">
.list-content {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;

  ::v-deep(.v-list-item) {
    padding: 0;
    margin: 0;

    .v-list-item__content {
      display: flex;
      justify-content: center;
    }
  }
}
</style>
