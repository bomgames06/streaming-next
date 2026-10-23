import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { browser } from 'wxt/browser'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import StreamsView from '@/components/views/streams/StreamsView.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import StreamGroupList from '@/components/listStream/StreamGroupList.vue'
import StreamList from '@/components/listStream/StreamList.vue'
import emitter from '@/events'
import { bodyFindByText, mountWithStore, settle } from '@tests/__utils__/util'
import { twitchServer, type TwitchServerData } from '@tests/__utils__/twitchServer'
import { account, apiFollowed, apiStream, apiUser, onlineItem, streamItem } from '@tests/__utils__/fixtures'

const serverData: TwitchServerData = {
  followedStreams: [
    apiStream({
      user_id: '1',
      user_login: 'alpha',
      user_name: 'Alpha',
      viewer_count: 10,
      game_id: 'g1',
      game_name: 'Minecraft',
    }),
    apiStream({
      user_id: '2',
      user_login: 'bravo',
      user_name: 'Bravo',
      viewer_count: 500,
      game_id: 'g2',
      game_name: 'Zelda',
    }),
  ],
  followedChannels: ['1', '2', '3', '4'].map((id) => apiFollowed({ broadcaster_id: id })),
  users: [
    apiUser({ id: '1', login: 'alpha', display_name: 'Alpha', broadcaster_type: 'partner' }),
    apiUser({ id: '2', login: 'bravo', display_name: 'Bravo' }),
    apiUser({ id: '3', login: 'charlie', display_name: 'Charlie' }),
    apiUser({ id: '4', login: 'delta', display_name: 'Delta' }),
  ],
}

async function mountView(state?: Record<string, unknown>, data?: TwitchServerData) {
  // The background answers the badge messages
  fakeBrowser.runtime.onMessage.addListener(() => undefined)
  const server = twitchServer({ ...serverData, ...data })
  const result = mountWithStore(StreamsView, {
    state: { accounts: { twitch: account() }, notificationType: 'partial', ...state },
  })
  await flushPromises()
  return { ...result, ...server }
}
function names(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper
    .findAllComponents(StreamListItem)
    .filter((item) => item.isVisible())
    .map((item) => item.props('item').name)
}
function toggle(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) {
  return wrapper.find(`button[aria-label="${label}"]`).trigger('click')
}

describe('StreamsView.vue', () => {
  it('Render the online streams fetched from Twitch', async () => {
    const sendMessageSpy = vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(undefined)
    const { wrapper, system } = await mountView()

    expect(names(wrapper)).toStrictEqual(['Alpha', 'Bravo'])
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'setCountBadge', count: 2 })
    expect(system.accountsCacheStreams.twitch!.map((item) => item.name)).toStrictEqual([
      'Alpha',
      'Bravo',
      'Charlie',
      'Delta',
    ])
    expect(system.loadingCount).toBe(0)
    expect(system.refreshingCount).toBe(0)
    // The rendered rows
    const titles = wrapper.findAll('.v-list-item-title').map((title) => title.attributes('title'))
    expect(titles).toStrictEqual(['Alpha', 'Bravo'])
    expect(wrapper.text()).toContain('Minecraft')
  })
  it('Show the cached streams while fetching and nothing without account', async () => {
    fakeBrowser.runtime.onMessage.addListener(() => undefined)
    let release: () => void = () => undefined
    twitchServer(serverData).http.get(
      '/channels/followed',
      () => new Promise((resolve) => (release = () => resolve({ data: { data: [], pagination: {} } })))
    )
    const cached = mountWithStore(StreamsView, {
      state: {
        accounts: { twitch: account() },
        accountsCacheStreams: { twitch: [streamItem({ id: '9', name: 'Cached' })] },
        showAlwaysOfflines: true,
      },
    })
    await flushPromises()
    expect(names(cached.wrapper)).toContain('Cached')
    release()
    await flushPromises()
    expect(names(cached.wrapper)).not.toContain('Cached')
    cached.wrapper.unmount()

    const { wrapper, http } = await mountView({ accounts: { twitch: account({ invalid: true }) } })
    expect(wrapper.text()).toContain('No streams')
    expect(http.requests).toHaveLength(0)
  })
  it('Show the offlines when asked or always', async () => {
    const { wrapper, system } = await mountView()
    const offlineButton = wrapper.find('button[aria-label="Offlines"]')
    expect(offlineButton.attributes('aria-checked')).toBe('false')

    await offlineButton.trigger('click')
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
    expect(wrapper.text()).toContain('Offline')

    await offlineButton.trigger('click')
    system.setShowAlwaysOfflines(true)
    await nextTick()
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
    // Always showing, the toggle is disabled
    expect(wrapper.find('button[aria-label="Offlines"]').attributes('disabled')).toBeDefined()
  })
  it('Filter by name or by game after the debounce', async () => {
    const { wrapper, system } = await mountView()

    system.streamFilterComp = 'char'
    await nextTick()
    // Debounced
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Bravo'])
    await settle(300)
    expect(names(wrapper)).toStrictEqual(['Charlie'])

    system.setStreamOrder('game')
    system.streamFilterComp = 'zel'
    await settle(300)
    expect(names(wrapper)).toStrictEqual(['Bravo'])

    system.streamFilterComp = 'nothing'
    await settle(300)
    expect(wrapper.text()).toContain('No streams')
  })
  it('Show favorites, favorite categories, notifications and category notifications', async () => {
    const { wrapper, system } = await mountView({
      favorites: [{ type: 'twitch', id: '3' }],
      categoryFavorites: [{ type: 'twitch', id: 'g1', name: 'Minecraft' }],
      notifications: [{ type: 'twitch', id: '4' }],
      categoryNotifications: [{ id: 'n', name: 'zelda', streams: [] }],
    })

    await toggle(wrapper, 'Favorites')
    expect(system.showFavoritesComp).toBe(true)
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Charlie'])
    // Offlines are part of the filter, the toggle is disabled
    expect(wrapper.find('button[aria-label="Offlines"]').attributes('disabled')).toBeDefined()

    await toggle(wrapper, 'Favorites')
    await toggle(wrapper, 'Notifications')
    expect(names(wrapper)).toStrictEqual(['Bravo', 'Delta'])

    // Both filters together
    await toggle(wrapper, 'Favorites')
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])

    await toggle(wrapper, 'Favorites')
    await toggle(wrapper, 'Notifications')
    system.categoryNotifications = [{ id: 'n', name: 'zelda', streams: [{ type: 'twitch', id: '9' }] }]
    await toggle(wrapper, 'Notifications')
    expect(names(wrapper)).toStrictEqual(['Delta'])
  })
  it('Hide notification filters by the notification type', async () => {
    const { wrapper, system } = await mountView({ notificationType: 'all' })
    expect(wrapper.find('button[aria-label="Notifications"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Category"]').exists()).toBe(true)

    system.setNotificationType('none')
    await nextTick()
    expect(wrapper.find('button[aria-label="Category"]').exists()).toBe(false)
  })
  it('Switch to the group list', async () => {
    const { wrapper, system } = await mountView({ groupStreams: [{ id: 'g', name: 'Friends', streams: [] }] })

    await toggle(wrapper, 'Stream groups')

    expect(system.showGroupsComp).toBe(true)
    expect(wrapper.findComponent(StreamGroupList).exists()).toBe(true)
    expect(wrapper.text()).toContain('Friends')
  })
  it('Open the category notification dialog with the followed streams', async () => {
    const { wrapper } = await mountView()

    await wrapper.find('button[aria-label="Category"]').trigger('click')
    await settle()

    expect(bodyFindByText('.v-card-title', 'Game notifications')).toBeTruthy()
  })
  it('Refresh on the refresh event and when the accounts change', async () => {
    const { http, system, wrapper } = await mountView()
    const fetches = () => http.find('/streams/followed').length
    expect(fetches()).toBe(1)

    emitter.emit('refresh')
    await flushPromises()
    expect(fetches()).toBe(2)

    // An invalid account clears the list without requests, valid again it fetches
    system.accounts.twitch!.invalid = true
    await flushPromises()
    expect(fetches()).toBe(2)
    expect(names(wrapper)).toStrictEqual([])
    system.accounts.twitch!.invalid = false
    await flushPromises()
    expect(fetches()).toBe(3)
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Bravo'])

    wrapper.unmount()
    emitter.emit('refresh')
    await flushPromises()
    expect(fetches()).toBe(3)
  })
  it('Fetch again every 5 minutes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { http } = await mountView()

    await vi.advanceTimersByTimeAsync(5 * 60000)
    expect(http.find('/streams/followed')).toHaveLength(2)
    vi.useRealTimers()
  })
  it('Coalesce refreshes requested while fetching', async () => {
    const { http } = await mountView()
    let release: () => void = () => undefined
    http.get(
      '/streams/followed',
      () => new Promise((resolve) => (release = () => resolve({ data: { data: [], pagination: {} } })))
    )

    emitter.emit('refresh')
    emitter.emit('refresh')
    emitter.emit('refresh')
    await flushPromises()
    release()
    await flushPromises()
    release()
    await flushPromises()

    // The first fetch, the one being released plus a single coalesced fetch
    expect(http.find('/streams/followed')).toHaveLength(3)
  })
  it('Disable the filters while on the details of a stream', async () => {
    const { wrapper, http } = await mountView()
    http.get('/videos', { data: { data: [], pagination: {} } })

    wrapper.findComponent(StreamList).vm.$emit('update:detailItem', onlineItem())
    await nextTick()

    expect(wrapper.find('button[aria-label="Favorites"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[aria-label="Stream groups"]').attributes('disabled')).toBeDefined()
  })
})
