import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script'
import { browser } from 'wxt/browser'
import { QUICK_DIALOG_CLOSE_MESSAGE } from '@/types/quickDialogTypes'

const HOST_ID = 'streaming-next-quick-dialog'

// Injected on demand by the keyboard command. Running it again while the dialog is open closes it.
export default defineUnlistedScript(() => {
  const existing = document.getElementById(HOST_ID)
  if (existing) return void existing.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  // The shadow root keeps the page styles away from the dialog and vice versa
  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
      background: rgba(0, 0, 0, 0.45);
    }
    iframe {
      width: min(520px, 92vw);
      height: min(560px, 80vh);
      border: none;
      border-radius: 8px;
      box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14);
      color-scheme: normal;
      background: transparent;
    }
  `

  const backdrop = document.createElement('div')
  backdrop.className = 'backdrop'

  const iframe = document.createElement('iframe')
  iframe.src = browser.runtime.getURL('/quick-dialog.html')
  iframe.title = 'Streaming Next'
  iframe.addEventListener('load', () => iframe.focus())

  function close() {
    window.removeEventListener('message', onMessage)
    host.remove()
  }
  function onMessage(event: MessageEvent) {
    if (event.source !== iframe.contentWindow) return
    if (event.data?.type === QUICK_DIALOG_CLOSE_MESSAGE) close()
  }

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close()
  })
  window.addEventListener('message', onMessage)

  backdrop.append(iframe)
  shadow.append(style, backdrop)
  document.documentElement.append(host)
})
