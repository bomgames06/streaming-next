<script lang="ts" setup>
import useAppInit from '@/composables/useAppInit'
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import AppLayout from '@/layouts/app/AppLayout.vue'
import useSystemStore from '@/store/system/useSystemStore.ts'

const { loaded, error } = useAppInit()

const system = useSystemStore()

const show = ref<boolean>(true)

watch(show, () => {
  if (!show.value) {
    const app = getCurrentInstance()
    if (!app) return

    app.appContext.app.unmount()
  }
})
</script>

<template>
  <v-app>
    <v-dialog v-model="show" width="100%" max-width="1200px">
      <v-card>
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
      </v-card>
    </v-dialog>
    <div id="toastr-content" />
  </v-app>
</template>

<style scoped lang="scss">
::v-deep(.v-application__wrap) {
  min-height: 0;
}
</style>
