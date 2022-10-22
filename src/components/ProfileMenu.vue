<template>
  <div v-if="user" class="d-flex align-center content-profile">
    <v-app-bar-nav-icon
      small
      :aria-label="$t('navbar')"
      class="mr-1 rounded-lg"
      @click="appStore.toggleDrawer()"
    />
    <v-menu v-model="menu" offset-y :close-on-content-click="false">
      <template #activator="{ on, attrs }">
        <v-btn
          text
          small
          class="text-none mr-2 button-ellipse px-1"
          :title="user.nickname"
          v-bind="attrs"
          v-on="on"
        >
          <v-avatar size="24" color="secondary" class="mr-1" aria-hidden="true">
            <v-img :src="user.avatar" :alt="$t('profile_picture_alt')" />
          </v-avatar>
          <span class="font-weight-bold text-body-2 ellipse">{{ user.nickname }}</span>
        </v-btn>
      </template>
      <v-list dense class="list-content-mini">
        <v-list-item dense @click="openProfile()">
          <v-list-item-icon class="mr-2">
            <v-icon small>
              mdi-account
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{$t('profile')}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-group dense class="py-0 list-content-mini">
          <template #activator>
            <v-list-item-icon class="mr-2">
              <v-icon small>mdi-google-translate</v-icon>
            </v-list-item-icon>
            <v-list-item-title>
              {{$t('language')}}
            </v-list-item-title>
          </template>
          <v-list dense class="py-0 list-content-mini-language" max-height="96px">
            <v-list-item-group
              :value="$i18n.locale"
              mandatory
              class="list-content-mini-language"
              @change="onChangeLanguage"
            >
              <v-list-item
                v-for="language in languages"
                :key="language.locale"
                :value="language.locale"
                dense
              >
                <v-list-item-title>
                  {{$t(language.i18nKey)}}
                </v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-list-group>
        <v-list-item dense @click="changeTheme">
          <v-list-item-icon class="mr-2">
            <v-icon small>
              {{$vuetify.theme.dark ? 'mdi-weather-night' : 'mdi-weather-sunny'}}
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{$t($vuetify.theme.dark ? 'dark' : 'light')}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider />
        <v-list-item dense @click="logout">
          <v-list-item-icon class="mr-2">
            <v-icon small>
              mdi-power
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{$t('logout')}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script lang="ts">
import { Component, InjectReactive, Vue } from 'vue-property-decorator';
import UserType from '@/types/user-type';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import { changeTheme } from '@/utils/utils';
import languagesData from '@/data/languages-data';
import LanguageType from '@/types/language-type';

@Component
export default class ProfileMenu extends Vue {
  @InjectReactive('user')
  private readonly user?: UserType | null;

  appStore = getModule(AppStore, this.$store);

  menu = false;

  languages: LanguageType[] = languagesData;

  changeTheme(): void {
    changeTheme(this.$vuetify);
  }

  async logout(): Promise<void> {
    browser.runtime.sendMessage({
      type: 'REVOKE',
      accessToken: this.appStore.auth?.accessToken,
    }).then();
    this.appStore.setAccessToken(null);
    this.menu = false;
  }

  openProfile(): void {
    if (!this.user) return;
    window.open(`https://www.twitch.tv/${this.user.login}`, '_blank');
  }

  onChangeLanguage(language: string): void {
    this.$i18n.locale = language;
    browser.storage.sync.set({ language }).then();
    this.$moment.locale(language.toLowerCase());
    document.documentElement.setAttribute('lang', language);
  }
}
</script>

<style lang="scss" scoped>
.content-profile {
  min-width: 0;
}
.button-ellipse {
  flex-shrink: 1;
  overflow: hidden;
  justify-content: start;
  > ::v-deep(.v-btn__content) {
    flex-shrink: 1;
    max-width: 100%;
  }
}
</style>
