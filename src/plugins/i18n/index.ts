import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ptBR from '@/locales/pt-BR.json'
import { en as enVuetify, pt as ptVuetify } from 'vuetify/locale'
import type { LocaleMessages } from 'vuetify'

export const locales = ['en', 'pt-BR'] as const
export type Locales = (typeof locales)[number]

export type Messages = {
  [key in Locales]: typeof en & { $vuetify: LocaleMessages }
}

export const locale: Locales = navigator.language || import.meta.env.VITE_I18N_LOCALE || 'en'
export const fallbackLocale: Locales = import.meta.env.VITE_I18N_FALLBACK_LOCALE || 'en'

const messages: Messages = {
  en: {
    ...en,
    $vuetify: enVuetify,
  },
  'pt-BR': {
    ...ptBR,
    $vuetify: ptVuetify,
  },
}

const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: fallbackLocale as string,
  messages,
})

export default i18n
