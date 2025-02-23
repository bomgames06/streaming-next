import { vi } from 'vitest'
import resizeObserverPolyfill from 'resize-observer-polyfill'

global.ResizeObserver = resizeObserverPolyfill

vi.mock('webextension-polyfill', () => ({}))
