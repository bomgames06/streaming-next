import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import VueCookies from 'vue-cookies';
import defaultTheme from '@/plugins/themes/default-theme';

Vue.use(Vuetify);
Vue.use(VueCookies, { expires: '3650000D' });

export default new Vuetify({
  theme: {
    dark: Vue.$cookies.get('dark') === 'true' || Vue.$cookies.get('dark') === true,
    themes: defaultTheme,
    options: {
      customProperties: true,
      variations: true,
    },
  },
});
