import { beforeEach, vi } from 'vitest'
import resizeObserverPolyfill from 'resize-observer-polyfill'
import { fakeBrowser } from '@webext-core/fake-browser'

global.ResizeObserver = resizeObserverPolyfill

vi.mock('webextension-polyfill', () => ({
  default: fakeBrowser,
}))

beforeEach(() => {
  fakeBrowser.reset()
})
