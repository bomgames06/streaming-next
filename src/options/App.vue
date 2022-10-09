<template>
  <v-app>
    <v-main class="relative">
      <div class="full-absolute overflow-y-auto overflow-x-hidden">
        <setttings />
      </div>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Setttings from '@/components/Setttings.vue';

@Component({
  components: { Setttings },
})
export default class App extends Vue {
}
</script>

<style>
html {
  overflow-y: auto;
}
</style>
