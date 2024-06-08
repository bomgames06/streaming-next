<script lang="ts" setup>
import useAppInit from '@/composables/useAppInit'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import SettingsView from '@/components/views/settings/SettingsView.vue'
import useSystemStore from '@/store/system/useSystemStore'

const { loaded } = useAppInit()

const system = useSystemStore()
</script>

<template>
  <v-app>
    <LoadingLayout v-if="system.screen === 'loading'" :loaded="loaded" />
    <v-main v-else-if="system.screen === 'home'" class="d-flex">
      <div class="overflow-y-auto flex-grow-1">
        <SettingsView />
      </div>
    </v-main>
    <div id="toastr-content" />
  </v-app>
</template>

<style></style>
