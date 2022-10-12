<script lang="ts">
import { processStorage } from '@/utils/utils';
import { Component, Vue } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';

const language = await processStorage('language');
const accessToken = await processStorage('accessToken');
const filterOrderList = await processStorage('filterOrderList');
const filterOrderAsc = await processStorage('filterOrderAsc');
const filterOrderVodList = await processStorage('filterOrderVodList');
const notification = await processStorage('notification');
const showAlwaysOfflines = await processStorage('showAlwaysOfflines');
const notificationIds = await processStorage('notificationIds');

@Component
export default class StartApp extends Vue {
  appStore = getModule(AppStore, this.$store);

  async created(): Promise<void> {
    this.$i18n.locale = language || navigator.language || process.env.VUE_APP_I18N_LOCALE || 'en';
    this.$moment.locale(this.$i18n.locale.toLowerCase());
    this.appStore.setAccessToken(accessToken);
    this.appStore.setFilterOrderListNative(filterOrderList || 'NAME');
    this.appStore.setFilterOrderAscNative(!!filterOrderAsc);
    this.appStore.setFilterOrderVodList(filterOrderVodList || 'time');
    this.appStore.setNotification(notification || 'none');
    this.appStore.setShowAlwaysOfflines(!!showAlwaysOfflines);
    this.appStore.setNotificationIds(notificationIds || []);

    browser.storage.local.set({ language: this.$i18n.locale }).then();
  }
}
</script>
