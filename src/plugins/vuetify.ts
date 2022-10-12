import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import defaultTheme from '@/plugins/themes/default-theme';
import { processStorage } from '@/utils/utils';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    dark: !!await processStorage('dark'),
    themes: defaultTheme,
    options: {
      customProperties: true,
      variations: true,
    },
  },
});
