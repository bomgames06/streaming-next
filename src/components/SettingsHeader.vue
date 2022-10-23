<template>
  <v-app-bar height="36" app class="header-settings">
    <profile-menu v-if="hasAuth" />
    <v-spacer />
    <div class="content-filter">
      <div v-if="!hasAuth">
        <v-menu offset-y bottom :close-on-content-click="false">
          <template #activator="{ attrs, on }">
            <v-btn
              v-bind="attrs"
              icon
              small
              class="ml-1 rounded-lg"
              :aria-label="$t('language')"
              v-on="on"
            >
              <v-icon>
                mdi-google-translate
              </v-icon>
            </v-btn>
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
        </v-menu>
        <v-btn
          icon
          small
          class="ml-1 rounded-lg"
          :aria-label="$t($vuetify.theme.dark ? 'dark' : 'light')"
          @click="changeTheme"
        >
          <v-icon>{{$vuetify.theme.dark ? 'mdi-weather-night' : 'mdi-weather-sunny'}}</v-icon>
        </v-btn>
      </div>
      <div v-else class="d-flex align-center justify-end">
        <template v-if="appStore.mode === 'VOD'">
          <v-menu offset-y>
            <template #activator="{ attrs, on }">
              <v-btn
                v-bind="attrs"
                :aria-label="$t('order')"
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
                :aria-label="$t('time')"
                :class="getFilterVodClass('time')"
                @click="appStore.setFilterOrderVodList('time')"
              >
                <v-list-item-icon
                  class="mx-0 list-item-icon-content fill-width align-self-center relative"
                >
                  <v-icon large>
                    mdi-calendar
                  </v-icon>
                </v-list-item-icon>
              </v-list-item>
              <v-list-item
                dense
                link
                :ripple="false"
                :aria-label="$t('trending')"
                :class="getFilterVodClass('trending')"
                @click="appStore.setFilterOrderVodList('trending')"
              >
                <v-list-item-icon
                  class="mx-0 list-item-icon-content fill-width align-self-center relative"
                >
                  <v-icon large>
                    mdi-star
                  </v-icon>
                </v-list-item-icon>
              </v-list-item>
              <v-list-item
                dense
                link
                :ripple="false"
                :aria-label="$t('views')"
                :class="getFilterVodClass('views')"
                @click="appStore.setFilterOrderVodList('views')"
              >
                <v-list-item-icon
                  class="mx-0 list-item-icon-content fill-width align-self-center relative"
                >
                  <v-icon large>
                    mdi-account-eye
                  </v-icon>
                </v-list-item-icon>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
        <template v-else-if="appStore.mode === 'CLIP'">
          <v-select
            :value="appStore.filterTimeClipList"
            :items="timeClips"
            item-value="value"
            :item-text="formatTimeClip"
            hide-details
            outlined
            solo
            dense
            return-object
            :menu-props="{ dense: true }"
            class="filter text-caption mr-1"
            :label="$t('filter')"
            :aria-label="$t('filter')"
            @input="appStore.setFilterTimeClipList($event)"
          />
        </template>
        <template v-else-if="screen === 'SEARCH'">
          <v-text-field
            ref="textFieldFilterSearchRef"
            :label="$t('filter')"
            :aria-label="$t('filter')"
            :value="appStore.filterChannelList"
            :error="!appStore.filterChannelList.trim()"
            :aria-invalid="!appStore.filterChannelList.trim()"
            hide-details
            outlined
            solo
            dense
            clearable
            class="filter text-caption mr-1"
            @input="appStore.setFilterChannelList($event)"
          />
        </template>
        <template v-else-if="screen === 'LIST'">
          <v-text-field
            ref="textFieldFilterListRef"
            :label="$t('filter')"
            :aria-label="$t('filter')"
            :value="appStore.filterList"
            hide-details
            outlined
            solo
            dense
            clearable
            class="filter text-caption"
            @input="appStore.setFilterList($event)"
          />
          <v-menu offset-y :close-on-content-click="false">
            <template #activator="{ attrs, on }">
              <v-btn
                v-bind="attrs"
                :aria-label="$t('order')"
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
                :aria-label="getFilterAriaLabel('NAME')"
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
                :aria-label="getFilterAriaLabel('VIEW')"
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
                :aria-label="getFilterAriaLabel('GAME')"
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
        <template v-else-if="screen === 'CATEGORY'">
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
            :aria-label="$t('language')"
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
    </div>
    <v-progress-linear v-show="appStore.isLoading" indeterminate class="absolute-bl" />
  </v-app-bar>
</template>

<script lang="ts">
import {
  Component, InjectReactive, Ref, Vue, Watch,
} from 'vue-property-decorator';
import { changeTheme } from '@/utils/utils';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import ProfileMenu from '@/components/ProfileMenu.vue';
import ScreenType from '@/types/screen-type';
import FilterOrderType from '@/types/filter-order-type';
import LanguageIso6391Type from '@/types/language-iso639-1-type';
import languageIso6391Data from '@/data/language-iso639-1-data';
import VueI18n from 'vue-i18n';
import FilterOrderVodType from '@/types/filter-order-vod-type';
import LanguageType from '@/types/language-type';
import languagesData from '@/data/languages-data';
import TimeClipsType from '@/types/time-clips-type';
import timeClipsData from '@/data/time-clips-data';

@Component({
  components: { ProfileMenu },
})
export default class SettingsHeader extends Vue {
  @InjectReactive('screen')
  private readonly screen?: ScreenType;

  appStore = getModule(AppStore, this.$store);

  languagesIso6391: LanguageIso6391Type[] = languageIso6391Data;

  timeClips: TimeClipsType[] = timeClipsData;

  languages: LanguageType[] = languagesData;

  @Ref('textFieldFilterSearchRef')
  textFieldFilterSearchRef?: any;

  @Ref('textFieldFilterListRef')
  textFieldFilterListRef?: any;

  get hasAuth(): boolean {
    return this.appStore.hasAuth;
  }

  @Watch('screen', { immediate: true })
  onChangeScreen() {
    if (this.screen === 'LIST') {
      this.$nextTick(() => {
        if (this.textFieldFilterListRef) this.textFieldFilterListRef.focus();
      });
    } else if (this.screen === 'SEARCH') {
      this.$nextTick(() => {
        if (this.textFieldFilterSearchRef) this.textFieldFilterSearchRef.focus();
      });
    }
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

  getFilterAriaLabel(filter: string): string {
    const textList = [];

    if (filter === 'NAME') {
      textList.push(this.$t('name'));
    } else if (filter === 'VIEW') {
      textList.push(this.$t('views'));
    } else if (filter === 'GAME') {
      textList.push(this.$t('game'));
    }
    if (this.appStore.filterOrderList === filter) {
      if (this.appStore.filterOrderAsc) {
        textList.push(this.$t('asc'));
      } else {
        textList.push(this.$t('desc'));
      }
    }

    return textList.join(' - ');
  }

  getFilterVodClass(filter: FilterOrderVodType): any {
    return {
      'px-1': true,
      'align-center': true,
      'v-list-item--active': this.appStore.filterOrderVodList === filter,
    };
  }

  formatLanguageIso6391(item: LanguageIso6391Type): VueI18n.TranslateResult {
    return this.$t(item.i18nKey);
  }

  formatTimeClip(item: TimeClipsType): VueI18n.TranslateResult {
    return this.$t(item.i18nKey);
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

.content-filter {
  max-width: 50%;
  flex-grow: 1;
  flex-shrink: 0;
  display: flex;
  justify-content: end;
}
</style>
