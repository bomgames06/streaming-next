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

export const fallbackLocale: Locales = import.meta.env.VITE_I18N_FALLBACK_LOCALE || 'en'

export function resolveLocale(value?: string): Locales | undefined {
  if (!value) return undefined
  const exact = locales.find((item) => item.toLowerCase() === value.toLowerCase())
  if (exact) return exact
  const language = value.split('-')[0].toLowerCase()
  return locales.find((item) => item.split('-')[0].toLowerCase() === language)
}

export const locale: Locales =
  resolveLocale(navigator.language) || resolveLocale(import.meta.env.VITE_I18N_LOCALE) || fallbackLocale

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
