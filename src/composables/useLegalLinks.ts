import { useI18n } from 'vue-i18n'

export type LegalLink = { name: 'terms' | 'privacy' | 'youtubeTerms'; url: string }

/** The YouTube API requires its terms next to the ones of the extension */
export default function useLegalLinks(): ComputedRef<LegalLink[]> {
  const { locale } = useI18n()

  return computed(() => {
    // English is the default language of the site, without a prefix
    const prefix = locale.value === 'en' ? '' : `/${locale.value}`
    const product = `${import.meta.env.VITE_SITE_URL}${prefix}/products/streaming-next`

    return [
      { name: 'terms', url: `${product}/terms` },
      { name: 'privacy', url: `${product}/privacy` },
      { name: 'youtubeTerms', url: import.meta.env.VITE_YOUTUBE_TERMS_URL },
    ]
  })
}
