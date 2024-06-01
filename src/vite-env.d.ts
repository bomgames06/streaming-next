/// <reference types="vite/client" />

import type { Locales } from '@/plugins/i18n'

interface ImportMetaEnv {
  readonly __APP_VERSION__: string
  readonly VITE_TWITTER_NAME: string
  readonly VITE_BUY_ME_A_COFFE_NAME: string

  readonly VITE_APP_API_TWITCH_URL: string
  readonly VITE_APP_OAUTH2_TWITCH_URL: string
  readonly VITE_APP_OAUTH2_TWITCH_CLIENTID: string

  readonly VITE_I18N_LOCALE?: Locales
  readonly VITE_I18N_FALLBACK_LOCALE?: Locales
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
