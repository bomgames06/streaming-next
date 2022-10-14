import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import defaultTheme from '@/plugins/themes/default-theme';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    dark: false,
    themes: defaultTheme,
    options: {
      customProperties: true,
      variations: true,
    },
  },
});
