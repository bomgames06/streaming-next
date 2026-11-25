import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import useAppInit from '@/composables/useAppInit'
import useStreamOrder from '@/composables/useStreamOrder'
import AppBusiness from '@/services/business/appBusiness'
import type { StreamItemLiveType } from '@/components/listStream/types/streamItemType'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import { mountWithStore } from '@tests/__utils__/util'
import { account, offlineItem, onlineItem, streamItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/appBusiness', () => ({
  default: { getSelfUser: vi.fn() },
}))
const getSelfUserMock = AppBusiness.getSelfUser as Mock<typeof AppBusiness.getSelfUser>

function mountAppInit(noAuth?: boolean) {
  let result: ReturnType<typeof useAppInit> | undefined
  const { wrapper, system } = mountWithStore(
    defineComponent({
      setup() {
        result = useAppInit(noAuth)
        return () => h('div')
      },
    })
  )
  return { wrapper, system, result: result! }
}

describe('composables', () => {
  describe('useAppInit', () => {
    it('Go to auth without accounts', async () => {
      const { system, result } = mountAppInit()
      await flushPromises()

      expect(result.loaded.value).toBe(true)
      expect(result.error.value).toBe(false)
      expect(system.screen).toBe('auth')
    })
    it('Go home with a valid account, or always when auth is not needed', async () => {
      await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
      getSelfUserMock.mockResolvedValue({ type: 'twitch', id: 'me-id', name: 'Me', login: 'me' })
      const first = mountAppInit()
      await flushPromises()
      expect(first.system.screen).toBe('home')
      expect(first.system.accounts.twitch?.name).toBe('Me')
      first.wrapper.unmount()

      await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: {} })
      const second = mountAppInit(true)
      await flushPromises()
      expect(second.system.screen).toBe('home')
    })
    it('Go to auth when every account is invalid', async () => {
      await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account({ invalid: true }) } })
      getSelfUserMock.mockRejectedValue(new Error('offline'))

      const { system } = mountAppInit()
      await flushPromises()

      expect(system.screen).toBe('auth')
    })
    it('Flag loading errors', async () => {
      vi.spyOn(browser.storage.sync, 'get').mockRejectedValueOnce(new Error('broken'))

      const { system, result } = mountAppInit()
      await flushPromises()

      expect(result.error.value).toBe(true)
      expect(result.loaded.value).toBe(false)
      expect(system.screen).toBe('loading')
    })
    it('Tick the timer every second until unmounted', async () => {
      vi.useFakeTimers()
      const { wrapper, system } = mountAppInit()
      const before = system.timer

      await vi.advanceTimersByTimeAsync(1000)
      expect(system.timer).toBeGreaterThan(before)

      wrapper.unmount()
      const after = system.timer
      await vi.advanceTimersByTimeAsync(3000)
      expect(system.timer).toBe(after)
      vi.useRealTimers()
    })
    it('Refresh accounts when the background asks for it', async () => {
      const { wrapper, system } = mountAppInit()
      await flushPromises()
      system.accounts = { twitch: account() }
      getSelfUserMock.mockResolvedValue({ type: 'twitch', id: 'me-id', name: 'Renamed', login: 'me' })

      await fakeBrowser.runtime.onMessage.trigger({ type: 'fetchAccounts' }, {}, () => undefined)
      expect(system.accounts.twitch?.name).toBe('Renamed')

      expect(await fakeBrowser.runtime.onMessage.trigger({ type: 'other' }, {}, () => undefined)).toStrictEqual([
        undefined,
      ])

      wrapper.unmount()
      expect(fakeBrowser.runtime.onMessage.hasListeners()).toBe(false)
    })
    it('Ask the background to fetch streams when the accounts change', async () => {
      const { system } = mountAppInit()
      await flushPromises()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const sendMessageSpy = vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValueOnce(undefined)

      system.accounts = { twitch: account() }
      await flushPromises()
      expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'fetchStream' })

      sendMessageSpy.mockRejectedValueOnce(new Error('No listeners available'))
      system.accounts.twitch!.invalid = true
      await flushPromises()
      expect(errorSpy).toHaveBeenCalledWith('Failed to request a stream fetch', expect.any(Error))
    })
  })

  describe('useStreamOrder', () => {
    function sortWith(state: Record<string, unknown>, items: StreamItemLiveType[], filter?: string) {
      let result: StreamItemLiveType[] = []
      mountWithStore(
        defineComponent({
          setup() {
            const { sortStreams } = useStreamOrder(ref(filter))
            result = sortStreams(items)
            return () => h('div')
          },
        }),
        { state }
      )
      return result.map((item) => item.name)
    }
    const items: StreamItemLiveType[] = [
      offlineItem({ id: '1', name: 'Échelon' }),
      onlineItem({ id: '2', name: 'bravo', viewerCount: 5, game: 'Zelda' }),
      onlineItem({ id: '3', name: 'Alpha', viewerCount: 50, game: 'Árvore' }),
      streamItem({ id: '4', name: 'Delta' }),
      onlineItem({ id: '5', name: 'Charlie', viewerCount: undefined, game: undefined }),
    ]

    it('Put online streams first ordering by name ignoring accents and case', () => {
      expect(sortWith({ streamOrder: 'name', streamOrderSort: true }, items)).toStrictEqual([
        'Alpha',
        'bravo',
        'Charlie',
        'Delta',
        'Échelon',
      ])
      expect(sortWith({ streamOrder: 'name', streamOrderSort: false }, items)).toStrictEqual([
        'Charlie',
        'bravo',
        'Alpha',
        'Échelon',
        'Delta',
      ])
    })
    it('Order by viewers and by game', () => {
      expect(sortWith({ streamOrder: 'view', streamOrderSort: false }, items).slice(0, 2)).toStrictEqual([
        'Alpha',
        'bravo',
      ])
      expect(sortWith({ streamOrder: 'game', streamOrderSort: true }, items)).toStrictEqual([
        'Charlie',
        'Alpha',
        'bravo',
        'Delta',
        'Échelon',
      ])
    })
    it('Ignore the online status while filtering', () => {
      expect(sortWith({ streamOrder: 'name', streamOrderSort: true }, items, 'a')).toStrictEqual([
        'Alpha',
        'bravo',
        'Charlie',
        'Delta',
        'Échelon',
      ])
    })
  })
})
