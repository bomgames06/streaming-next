<script setup lang="ts">
import type { HeaderAppBarViewStore, ViewStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import StreamsAppBarView from '@/components/views/streams/StreamsAppBarView.vue'
import StreamListVideosAppBarView from '@/components/listStream/appBarView/StreamListVideosAppBarView.vue'
import StreamListClipsAppBarView from '@/components/listStream/appBarView/StreamListClipsAppBarView.vue'
import CategoriesAppBarView from '@/components/views/categories/CategoriesAppBarView.vue'
import CategoriesListItemAppBarView from '@/components/listCategories/appBarView/CategoriesListItemAppBarView.vue'
import SearchAppBarView from '@/components/views/search/SearchAppBarView.vue'

const system = useSystemStore()

const appBarViews: { [key in ViewStore]?: Component } = {
  streams: StreamsAppBarView,
  categories: CategoriesAppBarView,
  search: SearchAppBarView,
}
const appBarViewsCustom: { [key in HeaderAppBarViewStore]?: Component } = {
  video: StreamListVideosAppBarView,
  clip: StreamListClipsAppBarView,
  categoryStreams: CategoriesListItemAppBarView,
}
</script>

<template>
  <Component
    :is="appBarViewsCustom[system.headerAppBarView]"
    v-if="system.headerAppBarView && appBarViewsCustom[system.headerAppBarView]"
    :key="system.headerAppBarView"
  />
  <Component
    :is="appBarViews[system.view]"
    v-if="!system.headerAppBarView && appBarViews[system.view]"
    :key="system.view"
  />
</template>

<style scoped></style>
