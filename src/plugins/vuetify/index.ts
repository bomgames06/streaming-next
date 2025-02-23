import 'vuetify/styles/main.sass'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import i18n from '@/plugins/i18n'
import { useI18n } from 'vue-i18n'
import light from '@/plugins/vuetify/themes/light'
import dark from '@/plugins/vuetify/themes/dark'

const vuetify = createVuetify({
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  defaults: {
    VList: {
      density: 'compact',
    },
    VRow: {
      dense: true,
    },
    VTextField: {
      variant: 'underlined',
    },
    VSelect: {
      variant: 'underlined',
    },
    VCombobox: {
      variant: 'underlined',
    },
    VAutocomplete: {
      variant: 'underlined',
    },
    VDialog: {
      scrollStrategy: 'reposition',
    },
    global: {
      hideDetails: 'auto',
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light,
      dark,
    },
  },
})

export default vuetify
