<script setup lang="ts">
import type { ViewStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import StreamsView from '@/components/views/streams/StreamsView.vue'
import CategoriesView from '@/components/views/categories/CategoriesView.vue'
import SearchView from '@/components/views/search/SearchView.vue'
import SettingsView from '@/components/views/settings/SettingsView.vue'

const system = useSystemStore()

const views: { [key in ViewStore]: Component } = {
  streams: StreamsView,
  categories: CategoriesView,
  search: SearchView,
  settings: SettingsView,
}
</script>

<template>
  <Component :is="views[system.view]" :key="system.view" v-bind="system.viewData" />
</template>

<style scoped></style>
