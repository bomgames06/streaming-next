<script lang="ts">
import { processStorage } from '@/utils/utils';
import { Component, Vue } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';

@Component
export default class StartApp extends Vue {
  appStore = getModule(AppStore, this.$store);

  loaded = false;

  async created(): Promise<void> {
    try {
      const dark = await processStorage('dark');
      const language = await processStorage('language');
      const accessToken = await processStorage('accessToken');
      const filterOrderList = await processStorage('filterOrderList');
      const filterOrderAsc = await processStorage('filterOrderAsc');
      const filterOrderVodList = await processStorage('filterOrderVodList');
      const notification = await processStorage('notification');
      const showAlwaysOfflines = await processStorage('showAlwaysOfflines');
      const notificationIds = await processStorage('notificationIds');

      this.$vuetify.theme.dark = !!dark;
      this.$i18n.locale = language || navigator.language || process.env.VUE_APP_I18N_LOCALE || 'en';
      this.$moment.locale(this.$i18n.locale.toLowerCase());
      this.appStore.setAccessToken(accessToken);
      this.appStore.setFilterOrderListNative(filterOrderList || 'NAME');
      this.appStore.setFilterOrderAscNative(filterOrderAsc != null ? !!filterOrderAsc : true);
      this.appStore.setFilterOrderVodList(filterOrderVodList || 'time');
      this.appStore.setNotification(notification || 'none');
      this.appStore.setShowAlwaysOfflines(!!showAlwaysOfflines);
      this.appStore.setNotificationIds(notificationIds || []);

      browser.storage.sync.set({ language: this.$i18n.locale }).then();
    } finally {
      this.loaded = true;
    }
  }
}
</script>
