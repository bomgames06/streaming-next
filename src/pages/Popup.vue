<script lang="ts" setup>
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import useAppInit from '@/composables/useAppInit'
import useSystemStore from '@/store/system/useSystemStore'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import AppLayout from '@/layouts/app/AppLayout.vue'

const { loaded, error } = useAppInit()

const system = useSystemStore()
</script>

<template>
  <v-app>
    <LoadingLayout v-if="system.screen === 'loading'" :error="error" :loaded="loaded" />
    <SimpleLayout v-else-if="system.screen === 'auth'">
      <AuthContent />
    </SimpleLayout>
    <AppLayout v-else-if="system.screen === 'home'">
      <template #appbar>
        <AppBarViewContent />
      </template>
      <template #sidebar="{ sidebar }">
        <AppSidebarContent v-model:sidebar="sidebar.value" />
      </template>
      <AppViewContent />
    </AppLayout>
    <div id="toastr-content" />
  </v-app>
</template>

<style scoped lang="scss">
::v-deep(.v-application__wrap) {
  min-height: 0;
}
</style>
