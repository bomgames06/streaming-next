<template>
  <v-app>
    <v-main>
      <setttings v-if="appStore.auth" />
      <erro-need-auth v-else />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import Setttings from '@/components/Setttings.vue';
import ErroNeedAuth from '@/components/ErroNeedAuth.vue';
import { mixins } from 'vue-class-component';
import StartApp from '@/mixins/StartApp.vue';

@Component({
  components: { ErroNeedAuth, Setttings },
})
export default class App extends mixins(StartApp) {
}
</script>

<style>
</style>
