import { afterEach, describe, expect, it } from 'vitest'
import type { DOMWrapper } from '@vue/test-utils'
import LegalLinks from '@/components/legal/LegalLinks.vue'
import LegalNotice from '@/components/legal/LegalNotice.vue'
import i18n from '@/plugins/i18n'
import { mountWithStore } from '@tests/__utils__/util'

function linksOf(links: DOMWrapper<HTMLAnchorElement>[]) {
  return links.map((link) => [link.text(), link.attributes('href'), link.attributes('target')])
}
const links = [
  ['Terms of Service', 'https://www.bomlabs.com.br/products/streaming-next/terms', '_blank'],
  ['Privacy Policy', 'https://www.bomlabs.com.br/products/streaming-next/privacy', '_blank'],
  ['YouTube Terms of Service', 'https://www.youtube.com/t/terms', '_blank'],
]

afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe('LegalLinks.vue', () => {
  it('Render the links of the terms and the privacy policy', () => {
    const { wrapper } = mountWithStore(LegalLinks)

    expect(linksOf(wrapper.findAll('a'))).toStrictEqual(links)
  })
})

describe('LegalNotice.vue', () => {
  it('Render the notice with the links in every language', async () => {
    const { wrapper } = mountWithStore(LegalNotice)

    expect(wrapper.text()).toBe(
      'By authenticating, you agree to the Terms of Service and the Privacy Policy. ' +
        'To use YouTube, you also agree to the YouTube Terms of Service.'
    )
    expect(linksOf(wrapper.findAll('a'))).toStrictEqual(links)

    i18n.global.locale.value = 'pt-BR'
    await nextTick()
    expect(wrapper.text()).toBe(
      'Ao autenticar, você concorda com os Termos de Serviço e a Política de Privacidade. ' +
        'Para usar o YouTube, você também concorda com os Termos de Serviço do YouTube.'
    )
    // The documents open in the language of the extension
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toStrictEqual([
      'https://www.bomlabs.com.br/pt-BR/products/streaming-next/terms',
      'https://www.bomlabs.com.br/pt-BR/products/streaming-next/privacy',
      'https://www.youtube.com/t/terms',
    ])
  })
})
