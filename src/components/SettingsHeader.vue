<template>
  <v-app-bar height="36" app class="header-settings">
    <profile-menu v-if="hasAuth" />
    <v-spacer />
    <div v-if="!hasAuth">
      <v-btn
        icon
        small
        :aria-label="$t($vuetify.theme.dark ? 'dark' : 'light')"
        @click="changeTheme"
      >
        <v-icon>{{$vuetify.theme.dark ? 'mdi-weather-night' : 'mdi-weather-sunny'}}</v-icon>
      </v-btn>
    </div>
    <template v-else>
      <div class="d-flex align-center">
        <template v-if="screen === 'LIST'">
          <v-text-field
            :label="$t('filter')"
            :value="appStore.filterList"
            hide-details
            outlined
            solo
            dense
            class="filter text-caption"
            @input="appStore.setFilterList($event)"
          />
          <v-menu offset-y :close-on-content-click="false">
            <template #activator="{ attrs, on }">
              <v-btn
                v-bind="attrs"
                icon
                small
                class="ml-1 rounded-lg"
                v-on="on"
              >
                <v-icon>mdi-sort</v-icon>
              </v-btn>
            </template>
            <v-list dense class="py-0 list-content-mini">
              <v-list-item
                dense
                link
                :ripple="false"
                :class="getFilterClass('NAME')"
                @click="appStore.setFilterOrderList('NAME')"
              >
                <v-list-item-icon
                  class="mx-0 list-item-icon-content fill-width align-self-center relative"
                >
                  <v-icon large>
                    mdi-order-alphabetical-ascending
                  </v-icon>
                  <v-avatar
                    v-if="appStore.filterOrderList === 'NAME'"
                    size="14"
                    color="list-active-color"
                    class="avatar-asc-desc"
                  >
                    <v-icon color="list-background" x-small>
                      {{appStore.filterOrderAsc ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick'}}
                    </v-icon>
                  </v-avatar>
                </v-list-item-icon>
              </v-list-item>
              <v-list-item
                dense
                link
                :ripple="false"
                :class="getFilterClass('VIEW')"
                @click="appStore.setFilterOrderList('VIEW')"
              >
                <v-list-item-icon
                  class="mx-0 list-item-icon-content fill-width align-self-center relative"
                >
                  <v-icon large>
                    mdi-account-eye
                  </v-icon>
                  <v-avatar
                    v-if="appStore.filterOrderList === 'VIEW'"
                    size="14"
                    color="list-active-color"
                    class="avatar-asc-desc"
                  >
                    <v-icon color="list-background" x-small>
                      {{appStore.filterOrderAsc ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick'}}
                    </v-icon>
                  </v-avatar>
                </v-list-item-icon>
              </v-list-item>
              <v-list-item
                dense
                link
                :ripple="false"
                :class="getFilterClass('GAME')"
                @click="appStore.setFilterOrderList('GAME')"
              >
                <v-list-item-icon
                  class="mx-0 list-item-icon-content fill-width align-self-center relative"
                >
                  <v-icon large>
                    mdi-controller
                  </v-icon>
                  <v-avatar
                    v-if="appStore.filterOrderList === 'GAME'"
                    size="14"
                    color="list-active-color"
                    class="avatar-asc-desc"
                  >
                    <v-icon color="list-background" x-small>
                      {{appStore.filterOrderAsc ? 'mdi-arrow-up-thick' : 'mdi-arrow-down-thick'}}
                    </v-icon>
                  </v-avatar>
                </v-list-item-icon>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn
            icon
            small
            :aria-label="$t('refresh')"
            class="rounded-lg"
            @click="$emit('refresh')"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
        <template v-if="screen === 'CATEGORY'">
          <v-select
            v-if="appStore.filterCategorySelected"
            :value="appStore.filterLanguageCategoryStreamList"
            :items="languagesIso6391"
            item-value="language"
            :item-text="formatLanguageIso6391"
            hide-details
            outlined
            solo
            dense
            return-object
            clearable
            :menu-props="{ dense: true }"
            class="filter text-caption"
            :label="$t('language')"
            @input="appStore.setFilterLanguageCategoryStreamList($event)"
          />
          <v-btn
            icon
            small
            :aria-label="$t('refresh')"
            class="rounded-lg"
            @click="$emit('refresh')"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
      </div>
    </template>
    <v-progress-linear v-show="appStore.isLoading" indeterminate class="absolute-bl" />
  </v-app-bar>
</template>

<script lang="ts">
import { Component, InjectReactive, Vue } from 'vue-property-decorator';
import { changeTheme } from '@/utils/utils';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import ProfileMenu from '@/components/ProfileMenu.vue';
import ScreenType from '@/types/screen-type';
import FilterOrderType from '@/types/filter-order-type';
import LanguageIso6391Type from '@/types/language-iso639-1-type';
import languageIso6391Data from '@/data/language-iso639-1-data';
import VueI18n from 'vue-i18n';

@Component({
  components: { ProfileMenu },
})
export default class SettingsHeader extends Vue {
  @InjectReactive('screen')
  private readonly screen?: ScreenType;

  appStore = getModule(AppStore, this.$store);

  languagesIso6391: LanguageIso6391Type[] = languageIso6391Data;

  get hasAuth(): boolean {
    return this.appStore.hasAuth;
  }

  changeTheme(): void {
    changeTheme(this.$vuetify);
  }

  getFilterClass(filter: FilterOrderType): any {
    return {
      'px-1': true,
      'align-center': true,
      'v-list-item--active': this.appStore.filterOrderList === filter,
    };
  }

  formatLanguageIso6391(item: LanguageIso6391Type): VueI18n.TranslateResult {
    return this.$t(item.i18nKey);
  }
}
</script>

<style lang="scss" scoped>
.header-settings {
  > ::v-deep(.v-toolbar__content) {
    padding-left: 4px;
    padding-right: 4px;
  }
}

.filter {
  > ::v-deep(.v-input__control), ::v-deep(.v-input__slot) {
    min-height: unset !important;
    height: 22px !important;
    line-height: 1rem !important;
  }
  ::v-deep(.v-label) {
    font-size: 0.75rem !important;
    font-weight: 400;
    letter-spacing: 0.0333333333em !important;
    font-family: "Roboto", sans-serif !important;
  }
}

.list-item-icon-content {
  min-width: unset !important;
}

.list-content-mini {
  > ::v-deep(.v-list-item) {
    min-height: unset;
    height: 40px !important;
  }
}

.avatar-asc-desc {
  position: absolute;
  top: -5px;
  right: -2px;
}
</style>
