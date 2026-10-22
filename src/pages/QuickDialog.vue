<script lang="ts" setup>
import useAppInit from '@/composables/useAppInit'
import useSystemStore from '@/store/system/useSystemStore'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import QuickDialogView from '@/components/views/quickDialog/QuickDialogView.vue'
import { closeQuickDialog } from '@/utils/quickDialog'

const { loaded, error } = useAppInit()

const system = useSystemStore()

function onKeydown(event: KeyboardEvent) {
  // Menus handle (and prevent) their own Escape, like the sort menu, only a free Escape closes the dialog
  if (event.key === 'Escape' && !event.defaultPrevented) closeQuickDialog()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <v-app>
    <LoadingLayout v-if="system.screen === 'loading'" :error="error" :loaded="loaded" />
    <SimpleLayout v-else-if="system.screen === 'auth'">
      <AuthContent />
    </SimpleLayout>
    <QuickDialogView v-else-if="system.screen === 'home'" />
    <div id="toastr-content" />
  </v-app>
</template>

<style scoped lang="scss">
::v-deep(.v-application__wrap) {
  min-height: 0;
}
</style>
