<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import emitter from '@/events'

const system = useSystemStore()
</script>

<template>
  <v-btn :icon="true" :size="system.appBarHeight" class="rounded-lg" @click="emitter.emit('refresh')">
    <v-icon>mdi-refresh</v-icon>
  </v-btn>
</template>

<style scoped lang="scss"></style>
