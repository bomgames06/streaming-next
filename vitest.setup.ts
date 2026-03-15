import { beforeEach, vi } from 'vitest'
import resizeObserverPolyfill from 'resize-observer-polyfill'
import { fakeBrowser } from '@webext-core/fake-browser'

// FIXME: I don't know yet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
global.ResizeObserver = resizeObserverPolyfill

vi.mock('webextension-polyfill', () => ({
  default: fakeBrowser,
}))

beforeEach(() => {
  fakeBrowser.reset()
})
