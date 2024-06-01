<script setup lang="ts">
import type { ViewStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { onMounted, onUnmounted } from 'vue'
import Mousetrap from 'mousetrap'

const sidebar = defineModel<boolean>('sidebar')

const system = useSystemStore()

onMounted(() => {
  Mousetrap.bind('alt+1', () => setView('streams'))
  Mousetrap.bind('alt+2', () => system.accounts.twitch && setView('categories'))
  Mousetrap.bind('alt+3', () => system.accounts.twitch && setView('search'))
  Mousetrap.bind('alt+a', () => setView('settings'))
})
onUnmounted(() => {
  Mousetrap.unbind('alt+1')
  Mousetrap.unbind('alt+2')
  Mousetrap.unbind('alt+3')
  Mousetrap.unbind('alt+a')
})

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
    <v-list-item :value="'streams' as ViewStore">
      <v-icon>mdi-format-list-text</v-icon>
    </v-list-item>
    <v-list-item v-if="system.accounts.twitch" :value="'categories' as ViewStore">
      <v-icon>mdi-controller</v-icon>
    </v-list-item>
    <v-list-item v-if="system.accounts.twitch" :value="'search' as ViewStore">
      <v-icon>mdi-magnify</v-icon>
    </v-list-item>
    <v-spacer />
    <v-list-item :value="'settings' as ViewStore">
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
