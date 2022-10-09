<template>
  <v-app>
    <settings-header @refresh="refreshList" />
    <v-main class="relative">
      <div class="full-absolute overflow-y-auto overflow-x-hidden">
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
            @input="appStore.setDrawer($event)"
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
                >
                  <v-list-item-icon>
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
                >
                  <v-list-item-icon>
                    <v-icon>
                      mdi-controller
                    </v-icon>
                  </v-list-item-icon>
                </v-list-item>
                <v-spacer />
                <v-list-item
                  value="SETTINGS"
                  link
                  :ripple="false"
                  class="flex-grow-0 flex-basis-auto"
                  :aria-label="$t('settings')"
                >
                  <v-list-item-icon>
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
          <setttings v-if="screen === 'SETTINGS'" />
          <categories
            v-if="screen === 'CATEGORY'"
            ref="categoriesRef"
            :category-id.sync="category"
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
  ProvideReactive, Ref,
  Vue,
  Watch,
} from 'vue-property-decorator';
import SettingsHeader from '@/components/SettingsHeader.vue';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import UserType from '@/types/user-type';
import TwitchApiService from '@/services/twitch-api/twitch-api-service';
import StreamsFollowing from '@/components/StreamsFollowing.vue';
import ScreenType from '@/types/screen-type';
import Setttings from '@/components/Setttings.vue';
import { processCookie } from '@/utils/utils';
import FilterOrderType from '@/types/filter-order-type';
import Categories from '@/components/Categories.vue';
import CategoryType from '@/types/category-type';

@Component({
  components: {
    Categories,
    Setttings,
    StreamsFollowing,
    SettingsHeader,
    Auth,
  },
})
export default class App extends Vue {
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

  created(): void {
    const accessToken = Vue.$cookies.get('accessToken');
    const filterOrderList = processCookie(Vue.$cookies.get('filterOrderList')) as FilterOrderType || 'NAME';
    const filterOrderAsc = processCookie(Vue.$cookies.get('filterOrderAsc')) == null ? true : processCookie(Vue.$cookies.get('filterOrderAsc')) === 'true';

    this.appStore.setAccessToken(accessToken && accessToken !== 'null' ? accessToken : null);
    this.appStore.setFilterOrderListNative(filterOrderList);
    this.appStore.setFilterOrderAscNative(filterOrderAsc);
  }

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
      this.streamsFollowingRef.loadStreamers(true);
    } else if (this.screen === 'CATEGORY' && this.categoriesRef) {
      this.categoriesRef.refresh();
    }
  }
}
</script>

<style lang="scss" scoped>
.drawer-content {
  margin-top: 36px !important;
  height: calc(100% - 36px) !important;
}
</style>
