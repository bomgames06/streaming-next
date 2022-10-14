<template>
  <v-app v-if="loaded">
    <v-main>
      <settings v-if="appStore.auth" />
      <erro-need-auth v-else />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import Settings from '@/components/Settings.vue';
import ErroNeedAuth from '@/components/ErroNeedAuth.vue';
import { mixins } from 'vue-class-component';
import StartApp from '@/mixins/StartApp.vue';

@Component({
  components: { ErroNeedAuth, Settings },
})
export default class App extends mixins(StartApp) {
}
</script>

<style lang="scss">
@import "src/styles/app";
</style>
