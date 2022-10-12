<template>
  <v-container>
    <span class="text-h6 mt-2">
      {{$t('settings')}}
    </span>
    <v-divider class="my-1" />
    <v-row dense>
      <v-col cols="12">
        <v-select
          :value="$i18n.locale"
          :label="$t('languages')"
          :items="languages"
          item-value="locale"
          :item-text="itemTextLanguage"
          hide-details
          menu-props="dense, offsetY"
          @change="onChangeLanguage"
        >
        </v-select>
      </v-col>
      <v-col cols="12">
        <v-radio-group
          :value="appStore.notification"
          mandatory
          :label="$t('notifications')"
          row
          dense
          class="radio-group-legend"
          hide-details
          @change="appStore.setNotification"
        >
          <v-radio :label="$t('all')" value="all" />
          <v-radio :label="$t('partial')" value="partial" />
          <v-radio :label="$t('none')" value="none" />
        </v-radio-group>
      </v-col>
      <v-col cols="12">
        <v-switch
          :input-value="$vuetify.theme.dark"
          :label="$t('dark_mode')"
          dense
          :true-value="true"
          :false-value="false"
          hide-details
          @change="changeTheme"
        />
      </v-col>
      <v-col cols="12">
        <v-switch
          :input-value="appStore.showAlwaysOfflines"
          :label="$t('show_offlines_always')"
          dense
          hide-details
          :true-value="true"
          :false-value="false"
          @change="appStore.setShowAlwaysOfflines"
        />
      </v-col>
    </v-row>
    <v-row dense justify="center">
      <v-col cols="auto">
        <about-me />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import AboutMe from '@/components/AboutMe.vue';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import LanguageType from '@/types/language-type';
import languagesData from '@/data/languages-data';
import VueI18n from 'vue-i18n';
import { changeTheme } from '@/utils/utils';

@Component({
  components: { AboutMe },
})
export default class Setttings extends Vue {
  appStore = getModule(AppStore, this.$store);

  languages: LanguageType[] = languagesData;

  itemTextLanguage(item: LanguageType): VueI18n.TranslateResult {
    return this.$t(item.i18nKey);
  }

  changeTheme(): void {
    changeTheme(this.$vuetify);
  }

  onChangeLanguage(language: string): void {
    this.$i18n.locale = language;
    browser.storage.local.set({ language }).then();
    this.$moment.locale(language.toLowerCase());
  }
}
</script>

<style lang="scss" scoped>
.radio-group-legend {
  ::v-deep(.v-label) {
    flex-basis: 100%;
  }
}
</style>
