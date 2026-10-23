import { describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { flushPromises } from '@vue/test-utils'
import { browser } from 'wxt/browser'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import StreamsView from '@/components/views/streams/StreamsView.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import StreamList from '@/components/listStream/StreamList.vue'
import emitter from '@/events'
import { mountWithStore, settle } from '@tests/__utils__/util'
import { twitchServer } from '@tests/__utils__/twitchServer'
import { account, apiFollowed, apiStream, apiUser } from '@tests/__utils__/fixtures'
import {
  apiYoutubeSubscription,
  apiYoutubeVideo,
  youtubeAccount,
  youtubeServer,
  type YoutubeServerData,
} from '@tests/__utils__/youtubeServer'

const hoursAgo = (hours: number) => moment().subtract(hours, 'hours').toISOString()

// Twitch: Alpha online, Charlie offline. YouTube: Yankee live, Zulu scheduled, Xray offline
const youtubeData: YoutubeServerData = {
  subscriptions: [
    apiYoutubeSubscription('UCy', 'Yankee'),
    apiYoutubeSubscription('UCz', 'Zulu'),
    apiYoutubeSubscription('UCx', 'Xray'),
  ],
  feeds: {
    UCy: [{ videoId: 'y1', published: hoursAgo(1) }],
    UCz: [{ videoId: 'z1', published: hoursAgo(1) }],
    UCx: [{ videoId: 'x1', published: hoursAgo(1) }],
  },
  videos: [
    apiYoutubeVideo('y1', 'UCy', {
      liveBroadcastContent: 'live',
      channelTitle: 'Yankee',
      title: 'Yankee live',
      liveStreamingDetails: { actualStartTime: hoursAgo(1), concurrentViewers: '700' },
    }),
    apiYoutubeVideo('z1', 'UCz', {
      liveBroadcastContent: 'upcoming',
      channelTitle: 'Zulu',
      title: 'Zulu soon',
      liveStreamingDetails: { scheduledStartTime: moment().add(2, 'hours').toISOString() },
    }),
    apiYoutubeVideo('x1', 'UCx'),
  ],
}

async function mountView(options?: {
  state?: Record<string, unknown>
  youtube?: YoutubeServerData
  feedsAllowed?: boolean
}) {
  // The background answers the badge messages
  fakeBrowser.runtime.onMessage.addListener(() => undefined)
  vi.spyOn(browser.permissions, 'contains').mockResolvedValue((options?.feedsAllowed ?? true) as never)
  const twitch = twitchServer({
    followedStreams: [apiStream({ user_id: '1', user_login: 'alpha', user_name: 'Alpha', viewer_count: 10 })],
    followedChannels: ['1', '3'].map((id) => apiFollowed({ broadcaster_id: id })),
    users: [
      apiUser({ id: '1', login: 'alpha', display_name: 'Alpha' }),
      apiUser({ id: '3', login: 'charlie', display_name: 'Charlie' }),
    ],
  })
  const youtube = youtubeServer({ ...youtubeData, ...options?.youtube }, twitch.http)
  const result = mountWithStore(StreamsView, {
    state: {
      accounts: { twitch: account(), youtube: youtubeAccount() },
      notificationType: 'partial',
      ...options?.state,
    },
  })
  await flushPromises()
  return { ...result, ...youtube }
}
function names(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper
    .findAllComponents(StreamListItem)
    .filter((item) => item.isVisible())
    .map((item) => item.props('item').name)
}

describe('StreamsView.vue with YouTube', () => {
  it('List the YouTube lives with the Twitch ones, then the scheduled ones', async () => {
    const { wrapper, system } = await mountView()

    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])
    const items = wrapper.findAllComponents(StreamListItem).map((item) => item.props('item'))
    expect(items[1]).toMatchObject({ type: 'youtube', status: 'online', id: 'UCy', videoId: 'y1', viewerCount: 700 })
    expect(items[2]).toMatchObject({ type: 'youtube', status: 'upcoming', id: 'UCz', videoId: 'z1' })

    expect(wrapper.text()).toContain('Yankee live')
    expect(wrapper.text()).toContain('Scheduled · in 2 hours')
    expect(wrapper.text()).toContain('Zulu soon')
    expect(system.accountsCacheStreams.youtube!.map((item) => item.name)).toStrictEqual(['Yankee', 'Zulu', 'Xray'])

    // The channels without live are offlines, the scheduled ones are not
    await wrapper.find('button[aria-label="Offlines"]').trigger('click')
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu', 'Charlie', 'Xray'])
  })
  it('Hide the scheduled lives unless filtering by name', async () => {
    const { wrapper, system } = await mountView()

    await wrapper.find('button[aria-label="Scheduled"]').trigger('click')
    expect(system.showUpcomings).toBe(false)
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee'])

    system.streamFilterComp = 'zul'
    await settle(300)
    expect(names(wrapper)).toStrictEqual(['Zulu'])

    system.streamFilterComp = ''
    await settle(300)
    await wrapper.find('button[aria-label="Scheduled"]').trigger('click')
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])
  })
  it('Filter by platform only with more than one platform', async () => {
    const { wrapper, system } = await mountView()

    await wrapper.find('[data-testid="stream-type-twitch"]').trigger('click')
    expect(system.hiddenStreamTypes).toStrictEqual(['twitch'])
    expect(names(wrapper)).toStrictEqual(['Yankee', 'Zulu'])

    await wrapper.find('[data-testid="stream-type-youtube"]').trigger('click')
    expect(names(wrapper)).toStrictEqual([])
    await wrapper.find('[data-testid="stream-type-twitch"]').trigger('click')
    expect(names(wrapper)).toStrictEqual(['Alpha'])

    // With a single platform the filter disappears and the hidden types are ignored
    system.accounts.twitch!.invalid = true
    await flushPromises()
    expect(wrapper.find('[data-testid="stream-type-youtube"]').exists()).toBe(false)
    expect(names(wrapper)).toStrictEqual(['Yankee', 'Zulu'])
  })
  it('Sort and favorite the YouTube items like the Twitch ones', async () => {
    const { wrapper, system } = await mountView({ state: { favorites: [{ type: 'youtube', id: 'UCz' }] } })

    system.setStreamOrder('view')
    await nextTick()
    // The scheduled ones are sorted together with the lives, without viewers yet
    expect(names(wrapper)).toStrictEqual(['Zulu', 'Alpha', 'Yankee'])
    system.setStreamOrder('view')
    await nextTick()
    expect(names(wrapper)).toStrictEqual(['Yankee', 'Alpha', 'Zulu'])
    // Still before the offlines
    system.setShowAlwaysOfflines(true)
    await nextTick()
    expect(names(wrapper).slice(0, 3)).toStrictEqual(['Yankee', 'Alpha', 'Zulu'])
    system.setShowAlwaysOfflines(false)

    await wrapper.find('button[aria-label="Favorites"]').trigger('click')
    expect(names(wrapper)).toStrictEqual(['Zulu'])
  })
  it('Open the YouTube video or channel', async () => {
    const createSpy = vi.spyOn(browser.tabs, 'create').mockResolvedValue({} as never)
    const { wrapper } = await mountView({ state: { showAlwaysOfflines: true } })
    const list = wrapper.findComponent(StreamList)
    const item = (name: string) => list.props('items').find((value) => value.name === name)!

    list.findAllComponents(StreamListItem)[0].vm.$emit('itemClick', { item: item('Yankee') })
    list.findAllComponents(StreamListItem)[0].vm.$emit('itemClick', { item: item('Zulu'), middle: true })
    list.findAllComponents(StreamListItem)[0].vm.$emit('itemClick', { item: item('Xray') })

    expect(createSpy.mock.calls).toStrictEqual([
      [{ url: 'https://www.youtube.com/watch?v=y1', active: true }],
      [{ url: 'https://www.youtube.com/watch?v=z1', active: false }],
      [{ url: 'https://www.youtube.com/channel/UCx', active: true }],
    ])
  })
  it('Offer only the YouTube actions on the context menu', async () => {
    const { wrapper } = await mountView()
    const yankee = wrapper.findAllComponents(StreamListItem).find((item) => item.props('item').name === 'Yankee')!

    await yankee.find('.v-list-item').trigger('contextmenu')
    await settle()

    const titles = Array.from(document.body.querySelectorAll('.v-menu .v-list-item-title')).map((title) =>
      title.textContent?.trim()
    )
    expect(titles).toStrictEqual(['Add favorite', 'Enable notification', 'Add to group'])
  })
  it('Tell that the category notifications are only for Twitch', async () => {
    const { wrapper } = await mountView()

    await wrapper.find('button[aria-label="Category"]').trigger('click')
    await settle()

    // Only an icon in the category field, its label tells it
    const icon = document.body.querySelector('.v-dialog [data-testid="twitch-only"]')
    expect(icon?.getAttribute('aria-label')).toBe('Only available for Twitch at the moment')
  })
  it('Ask the feed permission when missing', async () => {
    const { wrapper, http } = await mountView({ feedsAllowed: false })

    expect(names(wrapper)).toStrictEqual(['Alpha'])
    expect(wrapper.text()).toContain('Allow access to the YouTube feeds to find the lives')

    vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true as never)
    const requestSpy = vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never)
    await wrapper.find('.v-alert button').trigger('click')
    await flushPromises()

    expect(requestSpy).toHaveBeenCalledWith({ origins: ['https://www.youtube.com/*'] })
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])
    expect(wrapper.text()).not.toContain('Allow access to the YouTube feeds')
    expect(http.requests.some((request) => request.url.endsWith('/videos.xml'))).toBe(true)
  })
  it('Use the lives cache on mount and skip it on refresh', async () => {
    const { feedRequests, videoRequests, data, wrapper } = await mountView()
    expect(feedRequests()).toHaveLength(3)

    // A new mount within the cache time reads nothing
    wrapper.unmount()
    const second = mountWithStore(StreamsView, {
      state: { accounts: { twitch: account(), youtube: youtubeAccount() } },
    })
    await flushPromises()
    expect(feedRequests()).toHaveLength(3)
    expect(names(second.wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])

    // The refresh button forces the fetch, the live ended
    data.videos = data.videos!.map((video) =>
      video.id === 'y1' ? apiYoutubeVideo('y1', 'UCy', { liveStreamingDetails: { actualEndTime: hoursAgo(0) } }) : video
    )
    emitter.emit('refresh')
    await flushPromises()
    expect(feedRequests()).toHaveLength(6)
    expect(videoRequests()).toHaveLength(2)
    expect(names(second.wrapper)).toStrictEqual(['Alpha', 'Zulu'])
  })
  it('Renew the expired token before fetching and clear YouTube when it fails', async () => {
    const sendMessageSpy = vi
      .spyOn(browser.runtime, 'sendMessage')
      .mockImplementation(async (message: unknown) =>
        (message as { type: string }).type === 'auth' ? 'renewed-token' : undefined
      )
    const { wrapper, system, videoRequests } = await mountView({
      state: { accounts: { twitch: account(), youtube: youtubeAccount({ expiresAt: Date.now() - 1000 }) } },
    })

    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'auth',
      authType: 'youtube',
      forceVerify: false,
      interactive: false,
    })
    expect(system.accounts.youtube!.token).toBe('renewed-token')
    expect(system.accounts.youtube!.expiresAt).toBeGreaterThan(Date.now())
    expect(videoRequests()[0].headers.Authorization).toBe('Bearer renewed-token')
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])

    sendMessageSpy.mockRejectedValue(new Error('interaction_required'))
    system.accounts.youtube!.expiresAt = Date.now() - 1000
    emitter.emit('refresh')
    await flushPromises()

    expect(system.accounts.youtube!.invalid).toBe(true)
    expect(names(wrapper)).toStrictEqual(['Alpha'])
  })
})
