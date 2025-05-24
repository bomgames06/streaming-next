import 'vuetify/styles/main.sass'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import i18n from '@/plugins/i18n'
import { useI18n } from 'vue-i18n'
import light from '@/plugins/vuetify/themes/light'
import dark from '@/plugins/vuetify/themes/dark'

const vuetify = (quickPopup?: boolean) =>
  createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi,
      },
    },
    locale: {
      // fix i18n type
      adapter: createVueI18nAdapter({ i18n: i18n as never, useI18n }),
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
        attach: quickPopup ? '#quick-popup' : undefined,
      },
    },
    theme: {
      defaultTheme: 'light',
      themes: {
        light,
        dark,
      },
      stylesheetId: 'streaming-next-stylesheet',
      scope: quickPopup ? '#quick-popup' : undefined,
    },
  })

export default vuetify
