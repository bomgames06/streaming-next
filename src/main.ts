import Vue from 'vue';
import vuetify from '@/plugins/vuetify';
import i18n from '@/i18n';
import store from '@/store';
import '@/moment/moment-init';

// eslint-disable-next-line @typescript-eslint/no-var-requires
Vue.use(require('vue-shortkey'));

Vue.use((VueObj) => {
  VueObj.prototype.$appVersion = process.env.VUE_APP_VERSION;
  VueObj.$appVersion = process.env.VUE_APP_VERSION;
});

export default function init(App: any): void {
  new Vue({
    vuetify,
    i18n,
    store,
    render: (h) => h(App),
  }).$mount('#app');
}
