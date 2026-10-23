import { afterEach, beforeEach, vi } from 'vitest'
import resizeObserverPolyfill from 'resize-observer-polyfill'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { enableAutoUnmount } from '@vue/test-utils'
import axios from 'axios'

globalThis.ResizeObserver = resizeObserverPolyfill

// jsdom has no layout, every observed element is reported as visible so v-intersect renders its content
class IntersectionObserverMock {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    // Like the real observer the first report is async, the directive saves its state after calling observe
    queueMicrotask(() =>
      this.callback(
        [{ isIntersecting: true, intersectionRatio: 1, target } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
    )
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver
// Used by Vuetify overlays (v-menu, v-dialog) to position and scroll their content
globalThis.visualViewport ??= {
  width: 1024,
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  addEventListener() {},
  removeEventListener() {},
} as unknown as VisualViewport
Element.prototype.scrollIntoView ??= () => undefined
document.elementsFromPoint ??= () => []

// Tests never reach the network, requests must be answered by tests/__utils__/http.ts
axios.defaults.adapter = async (config) => {
  throw new Error(`Unmocked HTTP request: ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url || ''}`)
}

// Mounted components register global listeners (emitter, Mousetrap, browser events), never leak them between tests
enableAutoUnmount(afterEach)

beforeEach(() => {
  fakeBrowser.reset()
})
afterEach(() => {
  // Only spies made with vi.spyOn go back to the original implementation, module mocks stay
  vi.restoreAllMocks()
})
