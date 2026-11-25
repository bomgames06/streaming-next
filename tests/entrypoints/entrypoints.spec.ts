import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import registerPlugins from '@/plugins'
import registerUpdateBackground from '@/background/updateBackground'
import registerAuthBackground from '@/background/authBackground'
import registerFetchStreamBackground from '@/background/fetchStreamBackground'
import registerCommandBackground from '@/background/commandBackground'
import { QUICK_DIALOG_CLOSE_MESSAGE } from '@/types/quickDialogTypes'

vi.mock('@/plugins', () => ({ default: vi.fn() }))
vi.mock('@/background/updateBackground', () => ({ default: vi.fn() }))
vi.mock('@/background/authBackground', () => ({ default: vi.fn() }))
vi.mock('@/background/fetchStreamBackground', () => ({ default: vi.fn() }))
vi.mock('@/background/commandBackground', () => ({ default: vi.fn() }))
vi.mock('@/pages/Popup.vue', () => ({ default: { name: 'Popup', render: () => h('p', 'popup page') } }))
vi.mock('@/pages/Option.vue', () => ({ default: { name: 'Option', render: () => h('p', 'option page') } }))
vi.mock('@/pages/QuickDialog.vue', () => ({ default: { name: 'QuickDialog', render: () => h('p', 'quick page') } }))

describe('entrypoints', () => {
  it.each([
    ['popup', () => import('@/entrypoints/popup/main'), 'popup page'],
    ['options', () => import('@/entrypoints/options/main'), 'option page'],
    ['quick-dialog', () => import('@/entrypoints/quick-dialog/main'), 'quick page'],
  ])('Mount the %s page with the plugins', async (_, load, text) => {
    vi.mocked(registerPlugins).mockClear()
    document.body.innerHTML = ''

    await load()

    expect(registerPlugins).toHaveBeenCalledOnce()
    expect(document.body.textContent).toBe(text)
  })
  it('Register every background module', async () => {
    const { default: background } = await import('@/entrypoints/background')

    background.main()

    expect(registerUpdateBackground).toHaveBeenCalledOnce()
    expect(registerAuthBackground).toHaveBeenCalledOnce()
    expect(registerFetchStreamBackground).toHaveBeenCalledOnce()
    expect(registerCommandBackground).toHaveBeenCalledOnce()
  })

  describe('quick-dialog-inject', () => {
    // attachShadow is closed, keep a reference to read the dialog content
    function captureShadow() {
      const roots: ShadowRoot[] = []
      const attachShadow = HTMLElement.prototype.attachShadow
      vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, init) {
        const root = attachShadow.call(this, init)
        roots.push(root)
        return root
      })
      return roots
    }
    async function inject() {
      const { default: script } = await import('@/entrypoints/quick-dialog-inject')
      script.main()
      return document.getElementById('streaming-next-quick-dialog')
    }

    it('Open the dialog on an iframe and toggle it on the next run', async () => {
      const roots = captureShadow()

      const host = await inject()

      expect(host?.parentElement).toBe(document.documentElement)
      const iframe = roots[0].querySelector('iframe')!
      expect(iframe.src).toBe(browser.runtime.getURL('/quick-dialog.html'))
      expect(iframe.title).toBe('Streaming Next')
      expect(roots[0].querySelector('style')?.textContent).toContain('.backdrop')

      const focusSpy = vi.spyOn(iframe, 'focus')
      iframe.dispatchEvent(new Event('load'))
      expect(focusSpy).toHaveBeenCalledOnce()

      expect(await inject()).toBeNull()
    })
    it('Close clicking the backdrop only', async () => {
      const roots = captureShadow()
      const host = await inject()
      const backdrop = roots[0].querySelector<HTMLElement>('.backdrop')!

      roots[0].querySelector('iframe')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(host?.isConnected).toBe(true)

      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(host?.isConnected).toBe(false)
    })
    it('Close on the message of its own iframe only', async () => {
      const roots = captureShadow()
      const host = await inject()
      const iframe = roots[0].querySelector('iframe')!

      window.dispatchEvent(new MessageEvent('message', { data: { type: QUICK_DIALOG_CLOSE_MESSAGE }, source: window }))
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'other' }, source: iframe.contentWindow }))
      window.dispatchEvent(new MessageEvent('message', { data: null, source: iframe.contentWindow }))
      expect(host?.isConnected).toBe(true)

      window.dispatchEvent(
        new MessageEvent('message', { data: { type: QUICK_DIALOG_CLOSE_MESSAGE }, source: iframe.contentWindow })
      )
      expect(host?.isConnected).toBe(false)
    })
  })
})
