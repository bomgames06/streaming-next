<script setup lang="ts"></script>

<template>
  <div class="d-flex flex-column h-100">
    <slot name="top" />
    <v-container class="pa-3 flex-grow-1 overflow-y-auto">
      <slot />
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.min-h-100 {
  min-height: 100%;
}
</style>
