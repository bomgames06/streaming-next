import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import moment from 'moment'
import type { Mock } from '@vitest/spy'
import { browser } from 'wxt/browser'
import { getTestPlugins } from '@tests/__utils__/util.ts'
import QuickDialogView from '@/components/views/quickDialog/QuickDialogView.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import TwitchBusiness from '@/services/business/twitchBusiness'
import AppBusiness from '@/services/business/appBusiness'
import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
} from '@/components/listStream/types/streamItemType.ts'
import { QUICK_DIALOG_CLOSE_MESSAGE } from '@/types/quickDialogTypes'
import useSystemStore from '@/store/system/useSystemStore'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getStreamersOnlineFollowed: vi.fn() },
}))
vi.mock('@/services/business/appBusiness', () => ({
  default: { getStreamersFollowed: vi.fn() },
}))

function online(id: string, name: string, viewerCount: number, game: string): StreamItemLiveOnlineType {
  return {
    type: 'twitch',
    status: 'online',
    id,
    login: name.toLowerCase(),
    name,
    viewerCount,
    gameId: `game-${game}`,
    game,
    startedAt: moment(),
    verified: false,
  }
}
function stream(id: string, name: string): StreamItemLiveStreamType {
  return { type: 'twitch', status: 'stream', id, login: name.toLowerCase(), name, verified: false }
}

async function mountView(options?: { attachTo?: HTMLElement; state?: Record<string, unknown> }) {
  ;(TwitchBusiness.getStreamersOnlineFollowed as Mock).mockResolvedValue([
    online('1', 'Alpha', 10, 'Minecraft'),
    online('2', 'Bravo', 500, 'Just Chatting'),
  ])
  ;(AppBusiness.getStreamersFollowed as Mock).mockResolvedValue([
    stream('1', 'Alpha'),
    stream('2', 'Bravo'),
    stream('3', 'Charlie'),
  ])

  const wrapper = mount(QuickDialogView, {
    attachTo: options?.attachTo,
    global: {
      plugins: getTestPlugins({
        pinia: {
          stubActions: false,
          initialState: {
            System: {
              accounts: {
                twitch: {
                  id: 'uuid',
                  type: 'twitch',
                  accountId: 'accountId',
                  name: 'Me',
                  login: 'me',
                  token: 'token',
                  invalid: false,
                },
              },
              favorites: [{ type: 'twitch', id: '3' }],
              categoryFavorites: [{ type: 'twitch', id: 'game-Minecraft', name: 'Minecraft' }],
              ...options?.state,
            },
          },
        },
      }),
    },
  })
  await flushPromises()
  return wrapper
}

function names(wrapper: Awaited<ReturnType<typeof mountView>>) {
  return wrapper.findAllComponents(StreamListItem).map((item) => item.props('item').name)
}

describe('QuickDialogView.vue', () => {
  it('Use the stream order configured on the extension', async () => {
    expect(names(await mountView())).toStrictEqual(['Alpha', 'Bravo'])
    expect(names(await mountView({ state: { streamOrder: 'view', streamOrderSort: false } }))).toStrictEqual([
      'Bravo',
      'Alpha',
    ])
  })
  it('Change the shared stream order from the sort menu', async () => {
    // jsdom has no visualViewport, used by v-menu to position its content
    vi.stubGlobal('visualViewport', { width: 1024, height: 768, addEventListener() {}, removeEventListener() {} })
    const wrapper = await mountView({ attachTo: document.body })
    onTestFinished(() => {
      wrapper.unmount()
      vi.unstubAllGlobals()
    })
    const system = useSystemStore()

    await wrapper.find('button[aria-label="Sort"]').trigger('click')
    await flushPromises()
    // Name is already selected, choosing it again inverts the direction
    ;(document.querySelector('[data-testid="stream-order-name"]') as HTMLElement).click()
    await flushPromises()

    expect(system.streamOrder).toBe('name')
    expect(system.streamOrderSort).toBe(false)
    expect(names(wrapper)).toStrictEqual(['Bravo', 'Alpha'])
    const syncStorage = await browser.storage.sync.get('streamOrderSort')
    expect(syncStorage.streamOrderSort).toBe(false)
  })
  it('Filter by name, login or category typing, including offlines', async () => {
    const wrapper = await mountView()
    const input = wrapper.find('#quick-dialog-filter')

    await input.setValue('chat')
    expect(names(wrapper)).toStrictEqual(['Bravo'])

    await input.setValue('charlie')
    expect(names(wrapper)).toStrictEqual(['Charlie'])
  })
  it('Show only favorite streams and streams on favorite categories', async () => {
    const wrapper = await mountView()

    await wrapper.find('button[role="checkbox"]').trigger('click')
    // Alpha plays a favorite category, Charlie is an offline favorite stream
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Charlie'])
  })
  it('Move the focus one item per arrow key', async () => {
    // jsdom has no layout: VList only focuses rendered elements (offsetParent) and calls scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
    const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')!
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return this.parentElement
      },
    })
    onTestFinished(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent)
    })
    const wrapper = await mountView({ attachTo: document.body })
    await wrapper.find('#quick-dialog-filter').setValue('a')
    // Alpha, Bravo and the offline Charlie
    const items = () => wrapper.findAll('.v-list-item').map((item) => item.element as HTMLElement)
    const filter = wrapper.find('#quick-dialog-filter')

    await filter.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items()[0])

    await wrapper.find('.v-list-item').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items()[1])

    items()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(items()[2])

    items()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(document.activeElement).toBe(items()[1])

    items()[0].focus()
    items()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(document.activeElement).toBe(filter.element)

    wrapper.unmount()
  })
  it('Open the first stream with enter and close the dialog', async () => {
    const wrapper = await mountView()
    const createTabSpy = vi.spyOn(browser.tabs, 'create')
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)
    const postMessageSpy = vi.spyOn(window.parent, 'postMessage')

    await wrapper.find('#quick-dialog-filter').trigger('keydown', { key: 'Enter' })

    expect(createTabSpy).toHaveBeenCalledWith({ url: 'https://twitch.tv/alpha', active: true })
    // Outside an iframe the page closes itself, inside it asks the host page
    if (window.parent === window) expect(closeSpy).toHaveBeenCalled()
    else expect(postMessageSpy).toHaveBeenCalledWith({ type: QUICK_DIALOG_CLOSE_MESSAGE }, '*')
  })
})
