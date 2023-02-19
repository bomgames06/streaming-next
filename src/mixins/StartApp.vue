<script lang="ts">
import { processStorage } from '@/utils/utils';
import { Component, Vue } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import { take } from 'lodash';

@Component
export default class StartApp extends Vue {
  appStore = getModule(AppStore, this.$store);

  loaded = false;

  async created(): Promise<void> {
    try {
      const dark = await processStorage('dark');
      const language = await processStorage('language');
      const accessToken = await processStorage('accessToken');
      const expiredToken = await processStorage('expiredToken');
      const filterOrderList = await processStorage('filterOrderList');
      const filterOrderAsc = await processStorage('filterOrderAsc');
      const filterOrderVodList = await processStorage('filterOrderVodList');
      const notification = await processStorage('notification');
      const showAlwaysOfflines = await processStorage('showAlwaysOfflines');
      const notificationIds = await processStorage('notificationIds');

      this.$vuetify.theme.dark = !!dark;
      this.$i18n.locale = language || this.processNavigatorLanguage() || process.env.VUE_APP_I18N_LOCALE || 'en';
      this.$moment.locale(this.$i18n.locale.toLowerCase());
      document.documentElement.setAttribute('lang', this.$i18n.locale);
      this.appStore.setAccessToken(accessToken);
      this.appStore.setExpiredToken(expiredToken);
      this.appStore.setFilterOrderListNative(filterOrderList || 'NAME');
      this.appStore.setFilterOrderAscNative(filterOrderAsc != null ? !!filterOrderAsc : true);
      this.appStore.setFilterOrderVodList(filterOrderVodList || 'time');
      this.appStore.setNotification(notification || 'none');
      this.appStore.setShowAlwaysOfflines(!!showAlwaysOfflines);
      this.appStore.setNotificationIds(notificationIds || []);

      await browser.runtime.sendMessage({ type: 'START' });

      browser.storage.sync.set({ language: this.$i18n.locale }).then();
    } finally {
      this.loaded = true;
    }
  }

  processNavigatorLanguage(): string | null {
    const languagesSplit = navigator.language.split('-');
    for (let i = languagesSplit.length; i > 0; i -= 1) {
      const language = take(languagesSplit, i).join('-');
      if (this.$i18n.availableLocales.includes(language)) return language;
    }
    return null;
  }
}
</script>
