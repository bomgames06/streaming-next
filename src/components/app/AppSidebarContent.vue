<script setup lang="ts">
import type { ViewStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import { mdiCog, mdiController, mdiFormatListText, mdiMagnify } from '@mdi/js'

const sidebar = defineModel<boolean>('sidebar')

const system = useSystemStore()
const { t } = useI18n()

function openView(view: ViewStore) {
  system.setView(view)
  sidebar.value = false
}
</script>

<template>
  <v-list class="list-content" color="primary" mandatory nav :selected="[system.view]">
    <v-list-item
      accesskey="1"
      :aria-label="t('views.streams')"
      :aria-selected="system.view === 'streams'"
      role="option"
      tag="button"
      :value="'streams' as ViewStore"
      @click="openView('streams')"
    >
      <v-tooltip activator="parent" location="end" :text="t('views.streams')" />
      <v-icon :icon="mdiFormatListText" />
    </v-list-item>
    <v-list-item
      v-if="system.accounts.twitch && !system.accounts.twitch.invalid"
      accesskey="2"
      :aria-label="t('views.categories')"
      :aria-selected="system.view === 'categories'"
      role="option"
      :value="'categories' as ViewStore"
      @click="openView('categories')"
    >
      <v-tooltip activator="parent" location="end" :text="t('views.categories')" />
      <v-icon :icon="mdiController" />
    </v-list-item>
    <v-list-item
      v-if="system.accounts.twitch && !system.accounts.twitch.invalid"
      accesskey="3"
      :aria-label="t('views.search')"
      :aria-selected="system.view === 'search'"
      role="option"
      :value="'search' as ViewStore"
      @click="openView('search')"
    >
      <v-tooltip activator="parent" location="end" :text="t('views.search')" />
      <v-icon :icon="mdiMagnify" />
    </v-list-item>
    <v-spacer />
    <v-list-item
      accesskey="s"
      :aria-label="t('views.settings')"
      :aria-selected="system.view === 'settings'"
      role="option"
      :value="'settings' as ViewStore"
      @click="openView('settings')"
    >
      <v-tooltip activator="parent" location="end" :text="t('views.settings')" />
      <v-icon :icon="mdiCog" />
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
