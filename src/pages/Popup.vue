<script lang="ts" setup>
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import useAppInit from '@/composables/useAppInit'
import useSystemStore from '@/store/system/useSystemStore'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import AuthContent from '@/components/auth/AuthContent.vue'
import AppLayout from '@/layouts/app/AppLayout.vue'
import AppSidebarContent from '@/components/app/AppSidebarContent.vue'
import AppViewContent from '@/components/app/AppViewContent.vue'
import AppBarViewContent from '@/components/app/AppBarViewContent.vue'

const { loaded, error } = useAppInit()

const system = useSystemStore()
</script>

<template>
  <v-app>
    <LoadingLayout v-if="system.screen === 'loading'" :loaded="loaded" :error="error" />
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
