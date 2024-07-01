<script setup lang="ts"></script>

<template>
  <div class="d-flex flex-column min-h-100">
    <slot name="top" />
    <v-container class="pa-3 flex-grow-1 d-flex flex-column">
      <slot />
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.min-h-100 {
  min-height: 100%;
}
</style>
