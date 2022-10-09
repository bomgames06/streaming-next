<template>
  <v-container class="fill-height">
    <v-row class="flex-column fill-height" dense align="center" justify="center">
      <v-col cols="auto">
        <h2 class="text-body-1">{{$t('auth_mandatory_message')}}</h2>
      </v-col>
      <v-col cols="auto">
        <v-btn
          :loading="loading"
          :disabled="loading"
          small
          color="deep-purple accent-4"
          @click="auth()"
        >
          <v-icon class="mr-2" color="white">
            mdi-twitch
          </v-icon>
          <span class="white--text">{{$t('auth_twitch')}}</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';

@Component
export default class Auth extends Vue {
  appStore = getModule(AppStore, this.$store);

  loading = false;

  async auth(): Promise<void> {
    this.loading = true;
    try {
      const accessToken = await browser.runtime.sendMessage({ type: 'AUTH' });
      this.appStore.setAccessToken(accessToken);
    } finally {
      this.loading = false;
    }
  }
}
</script>

<style scoped>
</style>
