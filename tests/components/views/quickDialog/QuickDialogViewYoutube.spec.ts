import { describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { flushPromises } from '@vue/test-utils'
import { browser } from 'wxt/browser'
import QuickDialogView from '@/components/views/quickDialog/QuickDialogView.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import { mountWithStore } from '@tests/__utils__/util'
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

// Twitch: Alpha online. YouTube: Yankee live, Zulu scheduled, Xray offline
const youtubeData: YoutubeServerData = {
  subscriptions: [
    apiYoutubeSubscription('UCy', 'Yankee'),
    apiYoutubeSubscription('UCz', 'Zulu'),
    apiYoutubeSubscription('UCx', 'Xray'),
  ],
  feeds: {
    UCy: [{ videoId: 'y1', published: hoursAgo(1) }],
    UCz: [{ videoId: 'z1', published: hoursAgo(1) }],
    UCx: [],
  },
  videos: [
    apiYoutubeVideo('y1', 'UCy', {
      liveBroadcastContent: 'live',
      channelTitle: 'Yankee',
      liveStreamingDetails: { actualStartTime: hoursAgo(1), concurrentViewers: '700' },
    }),
    apiYoutubeVideo('z1', 'UCz', {
      liveBroadcastContent: 'upcoming',
      channelTitle: 'Zulu',
      liveStreamingDetails: { scheduledStartTime: moment().add(2, 'hours').toISOString() },
    }),
  ],
}

async function mountView(options?: { state?: Record<string, unknown>; feedsAllowed?: boolean }) {
  vi.spyOn(browser.permissions, 'contains').mockResolvedValue((options?.feedsAllowed ?? true) as never)
  const twitch = twitchServer({
    followedStreams: [apiStream({ user_id: '1', user_login: 'alpha', user_name: 'Alpha', viewer_count: 10 })],
    followedChannels: [apiFollowed({ broadcaster_id: '1' })],
    users: [apiUser({ id: '1', login: 'alpha', display_name: 'Alpha' })],
  })
  youtubeServer(youtubeData, twitch.http)
  const result = mountWithStore(QuickDialogView, {
    state: { accounts: { twitch: account(), youtube: youtubeAccount() }, ...options?.state },
  })
  await flushPromises()
  return result
}
function names(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper.findAllComponents(StreamListItem).map((item) => item.props('item').name)
}

describe('QuickDialogView.vue with YouTube', () => {
  it('List the YouTube lives and scheduled ones with the Twitch lives', async () => {
    const { wrapper } = await mountView()

    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])
    // Offlines only when searching
    const filter = wrapper.find('#quick-dialog-filter')
    await filter.setValue('xra')
    expect(names(wrapper)).toStrictEqual(['Xray'])
  })
  it('Share the scheduled and platform filters with the streams view', async () => {
    const { wrapper, system } = await mountView()

    await wrapper.find('button[aria-label="Scheduled"]').trigger('click')
    expect(system.showUpcomings).toBe(false)
    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee'])

    await wrapper.find('[data-testid="stream-type-twitch"]').trigger('click')
    expect(system.hiddenStreamTypes).toStrictEqual(['twitch'])
    expect(names(wrapper)).toStrictEqual(['Yankee'])
  })
  it('Show only Twitch without a YouTube account', async () => {
    const { wrapper } = await mountView({ state: { accounts: { twitch: account() } } })

    expect(names(wrapper)).toStrictEqual(['Alpha'])
    expect(wrapper.find('button[aria-label="Scheduled"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="stream-type-youtube"]').exists()).toBe(false)
  })
  it('Focus the filter once the frame receives the focus', async () => {
    // Inside the page iframe the autofocus attribute is blocked, the page focuses the frame on load
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    const { wrapper } = await mountView()
    const filter = wrapper.find('#quick-dialog-filter')
    expect(filter.attributes('autofocus')).toBeUndefined()
    expect(document.activeElement).not.toBe(filter.element)

    window.dispatchEvent(new FocusEvent('focus'))
    expect(document.activeElement).toBe(filter.element)
  })
  it('Open the YouTube video', async () => {
    const createSpy = vi.spyOn(browser.tabs, 'create').mockResolvedValue({} as never)
    const { wrapper } = await mountView()

    const zulu = wrapper.findAllComponents(StreamListItem).find((item) => item.props('item').name === 'Zulu')!
    zulu.vm.$emit('itemClick', { item: zulu.props('item'), middle: true })

    expect(createSpy).toHaveBeenCalledWith({ url: 'https://www.youtube.com/watch?v=z1', active: false })
  })
  it('Ask the feed permission when missing', async () => {
    const { wrapper } = await mountView({ feedsAllowed: false })
    expect(names(wrapper)).toStrictEqual(['Alpha'])

    vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true as never)
    vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never)
    await wrapper.find('.v-alert button').trigger('click')
    await flushPromises()

    expect(names(wrapper)).toStrictEqual(['Alpha', 'Yankee', 'Zulu'])
  })
})
