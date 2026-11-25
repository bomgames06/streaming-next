import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import StreamList from '@/components/listStream/StreamList.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import StreamGroupList from '@/components/listStream/StreamGroupList.vue'
import CategoryNotificationDialog from '@/components/categoryNotificationDialog/CategoryNotificationDialog.vue'
import GroupStreamDialog from '@/components/groupStreamDialog/GroupStreamDialog.vue'
import AppBusiness from '@/services/business/appBusiness'
import type { StreamItemType } from '@/components/listStream/types/streamItemType'
import { bodyFindByText, mountWithStore, settle } from '@tests/__utils__/util'
import { account, clipItem, onlineItem, streamItem, videoItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/appBusiness', () => ({
  default: {
    getUserVideosArchive: vi.fn(),
    getUserClips: vi.fn(),
    getStreamersFollowed: vi.fn(() => Promise.resolve([])),
    searchCategories: vi.fn(() => Promise.resolve({ items: [] })),
  },
}))
const videosMock = AppBusiness.getUserVideosArchive as Mock<typeof AppBusiness.getUserVideosArchive>
const clipsMock = AppBusiness.getUserClips as Mock<typeof AppBusiness.getUserClips>

const state = { accounts: { twitch: account() }, notificationType: 'partial' }

function mountList(props: Record<string, unknown>, extraState?: Record<string, unknown>) {
  return mountWithStore(StreamList, { props, state: { ...state, ...extraState } })
}
function names(wrapper: ReturnType<typeof mountList>['wrapper']) {
  return wrapper
    .findAllComponents(StreamListItem)
    .filter((item) => item.isVisible())
    .map((item) => `${item.props('item').status}:${item.props('item').name}`)
}

describe('StreamList.vue', () => {
  it('Show the loading and the empty state', async () => {
    const { wrapper } = mountList({ items: [], loading: true })
    expect(wrapper.find('.v-progress-circular').exists()).toBe(true)

    await wrapper.setProps({ loading: false })
    expect(wrapper.text()).toBe('No streams')
  })
  it('Render every item with dividers between them', () => {
    const { wrapper } = mountList({ items: [onlineItem(), streamItem({ id: '2', name: 'Bravo' })] })

    expect(names(wrapper)).toStrictEqual(['online:Alpha', 'stream:Bravo'])
    expect(wrapper.findAll('.v-list > .v-divider')).toHaveLength(1)
    expect(wrapper.find('.v-list').attributes('accesskey')).toBe('l')
  })
  it('Open the stream or the content on click', async () => {
    const createSpy = vi.spyOn(browser.tabs, 'create')
    const { wrapper } = mountList({ items: [onlineItem(), videoItem()] })
    const [online, video] = wrapper.findAllComponents(StreamListItem)

    online.vm.$emit('itemClick', { item: onlineItem(), middle: false })
    online.vm.$emit('itemClick', { item: onlineItem(), middle: true })
    video.vm.$emit('itemClick', { item: videoItem(), middle: false })
    await flushPromises()

    expect(createSpy.mock.calls).toStrictEqual([
      [{ url: 'https://twitch.tv/alpha', active: true }],
      [{ url: 'https://twitch.tv/alpha', active: false }],
      [{ url: 'https://twitch.tv/videos/v1', active: true }],
    ])
  })
  describe('Videos', () => {
    beforeEach(() => {
      videosMock.mockReset()
      videosMock.mockResolvedValue({ items: [] })
    })

    it('Show the videos of the stream and fetch more', async () => {
      const item = onlineItem()
      videosMock
        .mockResolvedValueOnce({ items: [videoItem()], cursor: 'next' })
        .mockResolvedValueOnce({ items: [videoItem({ id: 'v2', name: 'Second' })] })
      const { wrapper, system } = mountList({ items: [item, streamItem({ id: '2', name: 'Bravo' })] })

      wrapper.findComponent(StreamListItem).vm.$emit('menuItemClick', { type: 'video', item })
      await flushPromises()

      expect(system.videoOrder).toBe('time')
      expect(system.headerAppBarView).toBe('video')
      expect(videosMock).toHaveBeenCalledWith(system.accounts.twitch, '1', 'time', undefined, 20)
      expect(wrapper.find('h2').text()).toBe('Videos')
      expect(names(wrapper)).toStrictEqual(['online:Alpha', 'video:Alpha'])
      expect(wrapper.emitted('update:detailItem')).toStrictEqual([[item]])
      expect(system.loadingCount).toBe(0)

      await wrapper.find('.v-btn.mt-2').trigger('click')
      await flushPromises()
      expect(videosMock.mock.lastCall).toStrictEqual([system.accounts.twitch, '1', 'time', 'next', 20])
      expect(names(wrapper)).toStrictEqual(['online:Alpha', 'video:Alpha', 'video:Second'])
      // No more pages
      expect(wrapper.text()).not.toContain('Search more')
    })
    it('Fetch again when the order changes', async () => {
      const item = onlineItem()
      videosMock.mockResolvedValue({ items: [videoItem()], cursor: 'next' })
      const { wrapper, system } = mountList({ items: [item] })
      wrapper.findComponent(StreamListItem).vm.$emit('menuItemClick', { type: 'video', item })
      await flushPromises()

      system.setVideoOrder('views')
      await flushPromises()

      expect(videosMock.mock.lastCall).toStrictEqual([system.accounts.twitch, '1', 'views', undefined, 20])
    })
  })

  describe('Clips', () => {
    it('Show the clips of the stream and follow the period', async () => {
      const item = onlineItem()
      clipsMock.mockReset()
      clipsMock
        .mockResolvedValueOnce({ items: [clipItem()], cursor: 'next' })
        .mockResolvedValueOnce({ items: [clipItem({ id: 'c2', name: 'Second' })] })
        .mockResolvedValue({ items: [] })
      const { wrapper, system } = mountList({ items: [item] })

      wrapper.findComponent(StreamListItem).vm.$emit('menuItemClick', { type: 'clip', item })
      await flushPromises()

      expect(system.clipPeriod).toBe('7d')
      expect(system.headerAppBarView).toBe('clip')
      expect(clipsMock).toHaveBeenCalledWith(system.accounts.twitch, '1', '7d', undefined, 20)
      expect(wrapper.find('h2').text()).toBe('Clips')
      expect(names(wrapper)).toStrictEqual(['online:Alpha', 'clip:Alpha'])

      await wrapper.find('.v-btn.mt-2').trigger('click')
      await flushPromises()
      expect(names(wrapper)).toStrictEqual(['online:Alpha', 'clip:Alpha', 'clip:Second'])

      system.setClipPeriod('30d')
      await flushPromises()
      expect(clipsMock.mock.lastCall).toStrictEqual([system.accounts.twitch, '1', '30d', undefined, 20])
      expect(names(wrapper)).toStrictEqual(['online:Alpha'])
    })
  })

  describe('Details', () => {
    it('Go back clicking the item and follow item updates', async () => {
      const item = onlineItem()
      videosMock.mockReset()
      videosMock.mockResolvedValue({ items: [] })
      const { wrapper, system } = mountList({
        items: [item, streamItem({ id: '2', name: 'Bravo' })],
        detailItem: item,
        'onUpdate:detailItem': (value: StreamItemType | undefined) => wrapper.setProps({ detailItem: value }),
      })
      await flushPromises()
      // Other items are hidden while on details
      expect(names(wrapper)).toStrictEqual(['online:Alpha'])
      expect(wrapper.find('.v-list').attributes('accesskey')).toBeUndefined()

      // The detail follows the new instance of the same stream
      const updated = onlineItem({ title: 'New title' })
      await wrapper.setProps({ items: [updated] })
      expect((wrapper.props() as { detailItem?: unknown }).detailItem).toStrictEqual(updated)

      // Or leaves when the stream is gone
      await wrapper.setProps({ items: [streamItem({ id: '2' })] })
      await flushPromises()
      expect((wrapper.props() as { detailItem?: unknown }).detailItem).toBeUndefined()
      expect(system.headerAppBarView).toBeUndefined()

      await wrapper.setProps({ items: [item], detailItem: item })
      wrapper.findComponent(StreamListItem).vm.$emit('itemClick', { item })
      await flushPromises()
      expect((wrapper.props() as { detailItem?: unknown }).detailItem).toBeUndefined()
    })
    it('Do not fetch contents without a detail item', async () => {
      videosMock.mockReset()
      const item = onlineItem()
      const { wrapper } = mountList({
        items: [item],
        detailItem: undefined,
        'onUpdate:detailItem': () => undefined,
      })

      // The parent does not accept the detail item
      wrapper.findComponent(StreamListItem).vm.$emit('menuItemClick', { type: 'video', item })
      await flushPromises()

      expect(videosMock).not.toHaveBeenCalled()
    })
  })

  describe('Dialogs', () => {
    it('Open the category notification and group dialogs of a followed stream', async () => {
      const item = onlineItem()
      const followed = streamItem()
      const { wrapper } = mountList({ items: [item], streams: [followed] })
      expect(wrapper.findComponent(CategoryNotificationDialog).exists()).toBe(false)

      wrapper.findComponent(StreamListItem).vm.$emit('menuItemCategoryNotificationClick', item)
      await settle()
      const categoryDialog = wrapper.findComponent(CategoryNotificationDialog)
      expect(categoryDialog.props('streamItem')).toStrictEqual(followed)
      expect(bodyFindByText('.v-card-title', 'Game notifications')).toBeTruthy()
      categoryDialog.vm.$emit('update:modelValue', true)
      await nextTick()
      expect(wrapper.findComponent(CategoryNotificationDialog).exists()).toBe(true)
      categoryDialog.vm.$emit('update:modelValue', false)
      await settle()
      expect(wrapper.findComponent(CategoryNotificationDialog).exists()).toBe(false)

      wrapper.findComponent(StreamListItem).vm.$emit('menuItemGroupStreamClick', item)
      await settle()
      const groupDialog = wrapper.findComponent(GroupStreamDialog)
      expect(groupDialog.props('streamItem')).toStrictEqual(followed)
      groupDialog.vm.$emit('update:modelValue', true)
      await nextTick()
      expect(wrapper.findComponent(GroupStreamDialog).exists()).toBe(true)
      groupDialog.vm.$emit('update:modelValue', false)
      await settle()
      expect(wrapper.findComponent(GroupStreamDialog).exists()).toBe(false)
    })
    it('Need the followed streams to open the dialogs', async () => {
      const item = onlineItem()
      const { wrapper } = mountList({ items: [item] })

      wrapper.findComponent(StreamListItem).vm.$emit('menuItemCategoryNotificationClick', item)
      wrapper.findComponent(StreamListItem).vm.$emit('menuItemGroupStreamClick', item)
      await flushPromises()

      expect(wrapper.findComponent(CategoryNotificationDialog).exists()).toBe(false)
      expect(wrapper.findComponent(GroupStreamDialog).exists()).toBe(false)
    })
  })
})

describe('StreamGroupList.vue', () => {
  const groups = [
    { id: 'g2', name: 'Zeta', streams: [{ type: 'twitch', id: '2' }] },
    { id: 'g1', name: 'Alpha group', streams: [{ type: 'twitch', id: '1' }] },
  ]
  const items = [onlineItem(), onlineItem({ id: '2', name: 'Bravo' }), onlineItem({ id: '3', name: 'Charlie' })]

  function mountGroups(extraState?: Record<string, unknown>, props?: Record<string, unknown>) {
    return mountWithStore(StreamGroupList, {
      props: { items, streams: [streamItem()], ...props },
      state: { ...state, groupStreams: groups, ...extraState },
    })
  }
  function panelTitles(wrapper: ReturnType<typeof mountGroups>['wrapper']) {
    return wrapper.findAll('.v-expansion-panel-title').map((title) => title.text())
  }

  it('Show a message without groups', () => {
    const { wrapper } = mountGroups({ groupStreams: [] })

    expect(wrapper.text()).toContain('No group added')
    expect(wrapper.text()).toContain('Manage groups')
  })
  it('Show the groups ordered by name and the no group panel', async () => {
    const { wrapper, system } = mountGroups()
    expect(panelTitles(wrapper)).toStrictEqual(['Alpha group', 'Zeta'])

    await wrapper.find('button[aria-label="Show no group"]').trigger('click')
    expect(system.showNoGroup).toBe(true)
    expect(panelTitles(wrapper)).toStrictEqual(['Alpha group', 'Zeta', 'No group'])

    // Only the no group panel works without groups
    system.groupStreams = []
    await nextTick()
    expect(panelTitles(wrapper)).toStrictEqual(['No group'])
  })
  it('Expand and collapse every group', async () => {
    const { wrapper, system } = mountGroups({ showNoGroup: true })

    await wrapper.find('button[aria-label="Expand all"]').trigger('click')
    expect(system.groupExpandedComp).toStrictEqual(['g1', 'g2', 'noGroup'])
    const lists = wrapper.findAllComponents(StreamList)
    expect(lists.map((list) => list.props('items').map((item: StreamItemType) => item.name))).toStrictEqual([
      ['Alpha'],
      ['Bravo'],
      ['Charlie'],
    ])

    await wrapper.find('button[aria-label="Collapse all"]').trigger('click')
    expect(system.groupExpandedComp).toStrictEqual([])

    await wrapper.find('.v-expansion-panel-title').trigger('click')
    expect(system.groupExpandedComp).toStrictEqual(['g1'])
  })
  it('Hide the controls and the titles while on details', async () => {
    // The parent owns the detail item, like the streams view
    const { wrapper, system } = mountGroups({ showNoGroup: true }, { 'onUpdate:detailItem': () => undefined })
    system.groupExpandedComp = ['g1', 'g2', 'noGroup']
    await settle()

    // A stream without group: only the no group panel stays visible
    await wrapper.setProps({ detailItem: items[2] })
    expect(wrapper.findAll('.v-expansion-panel').map((panel) => panel.isVisible())).toStrictEqual([false, false, true])
    expect(wrapper.find('button[aria-label="Expand all"]').exists()).toBe(false)
    expect(panelTitles(wrapper)).toStrictEqual([])
    expect(wrapper.findAllComponents(StreamList).map((list) => list.props('detailItem')?.id)).toStrictEqual([
      '3',
      '3',
      '3',
    ])

    await wrapper.setProps({ detailItem: undefined })
    expect(panelTitles(wrapper)).toStrictEqual(['Alpha group', 'Zeta', 'No group'])
  })
  it('Forward the detail item chosen inside a group', async () => {
    const { wrapper, system } = mountGroups({ showNoGroup: true })
    system.groupExpandedComp = ['g1', 'g2', 'noGroup']
    await settle()

    wrapper.findAllComponents(StreamList)[0].vm.$emit('update:detailItem', items[0])

    expect(wrapper.emitted('update:detailItem')![0]).toStrictEqual([items[0]])
  })
  it('Keep the detail item of a grouped stream after the re-render', async () => {
    const { wrapper, system } = mountGroups({ showNoGroup: true })
    system.groupExpandedComp = ['g1', 'g2', 'noGroup']
    await settle()

    wrapper.findAllComponents(StreamList)[0].vm.$emit('update:detailItem', items[0])
    await flushPromises()

    expect(wrapper.emitted('update:detailItem')!.at(-1)).toStrictEqual([items[0]])
  })
  it('Open the groups dialog', async () => {
    const { wrapper } = mountGroups({}, { streams: undefined })

    await wrapper.find('button.mb-2').trigger('click')
    await settle()

    expect(bodyFindByText('.v-card-title', 'Stream groups')).toBeTruthy()
    expect(wrapper.findComponent(GroupStreamDialog).props('streams')).toStrictEqual([])
  })
})
