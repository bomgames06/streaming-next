import { beforeEach } from 'vitest'
import resizeObserverPolyfill from 'resize-observer-polyfill'
import { fakeBrowser } from 'wxt/testing/fake-browser'

globalThis.ResizeObserver = resizeObserverPolyfill

beforeEach(() => {
  fakeBrowser.reset()
})
