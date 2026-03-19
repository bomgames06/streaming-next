import 'vuetify/styles/main.sass'
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import i18n from '@/plugins/i18n'
import { type I18n, useI18n } from 'vue-i18n'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import light from '@/plugins/vuetify/themes/light'
import dark from '@/plugins/vuetify/themes/dark'

const vuetify = createVuetify({
  locale: {
    adapter: createVueI18nAdapter({
      i18n: i18n as I18n<never, Record<string, unknown>, Record<string, unknown>, string, false>,
      useI18n,
    }),
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  defaults: {
    VTooltip: {
      interactive: false,
    },
    VList: {
      density: 'compact',
    },
    VRow: {
      density: 'compact',
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
