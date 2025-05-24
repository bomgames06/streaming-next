<script lang="ts" setup>
import useAppInit from '@/composables/useAppInit'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import useSystemStore from '@/store/system/useSystemStore'

const { loaded } = useAppInit(true)

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

<style scoped lang="scss">
::v-deep(.v-application__wrap) {
  min-height: 0;
}
</style>
