<template>
  <v-app v-if="loaded">
    <settings-header @refresh="refreshList" />
    <v-main class="relative">
      <div
        class="full-absolute overflow-y-auto overflow-x-hidden"
      >
        <auth v-if="!hasAuth" />
        <template v-else>
          <v-navigation-drawer
            :value="appStore.drawer"
            fixed
            temporary
            mini-variant
            hide-overlay
            mini-variant-width="36"
            class="drawer-content"
            @change="appStore.setDrawer($event)"
          >
            <v-list dense class="py-0 fill-height">
              <v-list-item-group
                v-model="screen"
                class="d-flex flex-column fill-height"
                color="primary"
                mandatory
                @change="appStore.setDrawer(false)"
              >
                <v-list-item
                  value="LIST"
                  link
                  :ripple="false"
                  class="flex-grow-0 flex-basis-auto"
                  :aria-label="$t('followed')"
                  v-shortkey="['alt', '1']"
                  @shortkey="screen = 'LIST'"
                >
                  <v-list-item-icon class="mx-0">
                    <v-icon>
                      mdi-format-list-text
                    </v-icon>
                  </v-list-item-icon>
                </v-list-item>
                <v-list-item
                  value="CATEGORY"
                  link
                  :ripple="false"
                  class="flex-grow-0 flex-basis-auto"
                  :aria-label="$t('categories')"
                  v-shortkey="['alt', '2']"
                  @shortkey="screen = 'CATEGORY'"
                >
                  <v-list-item-icon class="mx-0">
                    <v-icon>
                      mdi-controller
                    </v-icon>
                  </v-list-item-icon>
                </v-list-item>
                <v-list-item
                  value="SEARCH"
                  link
                  :ripple="false"
                  class="flex-grow-0 flex-basis-auto"
                  :aria-label="$t('search')"
                  v-shortkey="['alt', '3']"
                  @shortkey="screen = 'SEARCH'"
                >
                  <v-list-item-icon class="mx-0">
                    <v-icon>
                      mdi-magnify
                    </v-icon>
                  </v-list-item-icon>
                </v-list-item>
                <v-spacer />
                <v-list-item
                  value="SETTINGS"
                  link
                  :ripple="false"
                  class="flex-grow-0 flex-basis-auto"
                  :aria-label="$tc('settings')"
                  v-shortkey="['alt', 'a']"
                  @shortkey="screen = 'SETTINGS'"
                >
                  <v-list-item-icon class="mx-0">
                    <v-icon>
                      mdi-cog
                    </v-icon>
                  </v-list-item-icon>
                </v-list-item>
              </v-list-item-group>
            </v-list>
          </v-navigation-drawer>
          <streams-following
            v-if="screen === 'LIST'"
            ref="streamsFollowingRef"
            @click-category="clickCategory"
          />
          <settings v-if="screen === 'SETTINGS'" />
          <categories
            v-if="screen === 'CATEGORY'"
            ref="categoriesRef"
            :category-id.sync="category"
          />
          <search-user
            v-if="screen === 'SEARCH'"
            ref="searchUserRef"
            @click-category="clickCategory"
          />
        </template>
      </div>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Auth from '@/components/Auth.vue';
import {
  Component,
  ProvideReactive,
  Ref,
  Watch,
} from 'vue-property-decorator';
import SettingsHeader from '@/components/SettingsHeader.vue';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import UserType from '@/types/user-type';
import TwitchApiService from '@/services/twitch-api/twitch-api-service';
import StreamsFollowing from '@/components/StreamsFollowing.vue';
import ScreenType from '@/types/screen-type';
import Settings from '@/components/Settings.vue';
import Categories from '@/components/Categories.vue';
import SearchUser from '@/components/SearchUser.vue';
import { mixins } from 'vue-class-component';
import StartApp from '@/mixins/StartApp.vue';

@Component({
  components: {
    SearchUser,
    Categories,
    Settings,
    StreamsFollowing,
    SettingsHeader,
    Auth,
  },
})
export default class App extends mixins(StartApp) {
  @ProvideReactive('user')
  private user?: UserType | null = null;

  @ProvideReactive('screen')
  private screen: ScreenType = 'LIST';

  appStore = getModule(AppStore, this.$store);

  category: string | null = null;

  @Ref('streamsFollowingRef')
  streamsFollowingRef?: StreamsFollowing

  @Ref('categoriesRef')
  categoriesRef?: Categories

  get hasAuth(): boolean {
    return this.appStore.hasAuth;
  }

  @Watch('hasAuth')
  onHasAuth(): void {
    this.loadUser();
  }

  async loadUser(): Promise<void> {
    if (!this.hasAuth) {
      this.user = null;
      return;
    }
    try {
      this.user = await TwitchApiService.users.getSelfUser(this.appStore.auth?.accessToken);
      this.screen = 'LIST';
    } catch (e) {
      this.user = null;
    }
  }

  clickCategory(id: string): void {
    this.category = id;
    this.screen = 'CATEGORY';
  }

  refreshList(): void {
    if (this.screen === 'LIST' && this.streamsFollowingRef) {
      this.streamsFollowingRef.refresh();
    } else if (this.screen === 'CATEGORY' && this.categoriesRef) {
      this.categoriesRef.refresh();
    }
  }
}
</script>

<style lang="scss">
@import "src/styles/app";

.drawer-content {
  margin-top: 36px !important;
  height: calc(100% - 36px) !important;
}
</style>
