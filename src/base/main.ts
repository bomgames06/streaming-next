import Vue from 'vue';
import vuetify from '@/plugins/vuetify';
import i18n from '@/i18n';
import store from '@/store';
import '../styles/app.scss';
import 'moment-duration-format';

export default function init(App: any): void {
  new Vue({
    vuetify,
    i18n,
    store,
    render: (h) => h(App),
  }).$mount('#app');
}
