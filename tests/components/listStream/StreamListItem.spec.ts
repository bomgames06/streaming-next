import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mdiBell, mdiCheckDecagram, mdiStar } from '@mdi/js'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import type { StreamItemType } from '@/components/listStream/types/streamItemType'
import { bodyFindAll, bodyFindByText, mountWithStore, settle } from '@tests/__utils__/util'
import { clipItem, offlineItem, onlineItem, streamItem, videoItem } from '@tests/__utils__/fixtures'
import moment from 'moment'

function mountItem(item: StreamItemType, props?: Record<string, unknown>, state?: Record<string, unknown>) {
  return mountWithStore(StreamListItem, {
    props: { item, ...props },
    state: { timer: Date.now(), notificationType: 'partial', ...state },
  })
}
function menuTitles() {
  return bodyFindAll('.v-overlay--active .v-list-item-title').map((item) => item.textContent?.trim())
}
async function openMenu(wrapper: ReturnType<typeof mountItem>['wrapper']) {
  const open = bodyFindAll('.v-overlay--active .v-list')[0]
  if (open) {
    open.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
  }
  await wrapper.find('.list-item').trigger('contextmenu', { clientX: 10, clientY: 20 })
  await settle()
}
async function clickMenu(title: string) {
  const item = bodyFindByText('.v-overlay--active .v-list-item', title)
  if (!item) throw new Error(`Menu item "${title}" not found in ${JSON.stringify(menuTitles())}`)
  item.click()
  await settle()
}

describe('StreamListItem.vue', () => {
  describe('Rendering', () => {
    it('Render an online stream', async () => {
      const item = onlineItem({ startedAt: moment().subtract(3723, 'seconds'), verified: true, viewerCount: 1234 })
      const { wrapper } = mountItem(item, { dump: 'dump-1' })
      await flushPromises()

      const img = wrapper.find('img')
      expect(img.attributes('alt')).toBe('Live preview from Alpha')
      expect(img.attributes('src')).toBe('https://preview/alpha-290x163.125&dump=dump-1')
      expect(wrapper.find('link[rel="prefetch"]').attributes('href')).toBe(img.attributes('src'))
      expect(wrapper.find('.v-list-item-title').attributes('title')).toBe('Alpha')
      expect(wrapper.find('.v-list-item-title').text()).toContain('Alpha')
      expect(wrapper.find('[aria-label="1,234 Viewers"]').text()).toBe('1,234')
      expect(wrapper.find('.v-list-item-title').html()).toContain(mdiCheckDecagram)
      const subtitles = wrapper.findAll('.v-list-item-subtitle').map((subtitle) => subtitle.text())
      expect(subtitles).toStrictEqual(['Minecraft', 'Alpha title'])

      // The stream duration shows while focused
      expect(wrapper.find('.start-at-content').exists()).toBe(false)
      await wrapper.find('.list-item').trigger('focusin')
      expect(wrapper.find('.start-at-content').text()).toBe('01:02:03')
      await wrapper.find('.list-item').trigger('focusout')
      expect(wrapper.find('.start-at-content').exists()).toBe(false)
    })
    it('Render a single viewer and a string preview image', async () => {
      const { wrapper } = mountItem(
        onlineItem({ viewerCount: 1, previewImage: 'https://preview/string.jpg', title: undefined, game: undefined }),
        { disableViewCount: false }
      )
      await flushPromises()

      expect(wrapper.find('img').attributes('src')).toBe('https://preview/string.jpg')
      expect(wrapper.find('[aria-label="1 Viewer"]').exists()).toBe(true)
      expect(wrapper.findAll('.v-list-item-subtitle')).toHaveLength(0)
    })
    it('Hide the viewer count and keep zero viewers silent', async () => {
      const hidden = mountItem(onlineItem(), { disableViewCount: true })
      await flushPromises()
      expect(hidden.wrapper.find('.text-red').exists()).toBe(false)
      hidden.wrapper.unmount()

      const zero = mountItem(onlineItem({ viewerCount: undefined, previewImage: undefined }))
      await flushPromises()
      expect(zero.wrapper.find('.text-red').attributes('aria-label')).toBe('')
      expect(zero.wrapper.find('.text-red').text()).toBe('0')
      expect(zero.wrapper.find('link[rel="prefetch"]').exists()).toBe(false)
    })
    it('Render notification and favorite badges', async () => {
      const state = {
        notifications: [{ type: 'twitch', id: '1' }],
        favorites: [{ type: 'twitch', id: '1' }],
        categoryFavorites: [{ type: 'twitch', id: 'game-1', name: 'Minecraft' }],
        categoryNotifications: [{ id: 'c', name: 'minecraft', streams: [{ type: 'twitch', id: '9' }] }],
      }
      const online = mountItem(onlineItem(), {}, state)
      await flushPromises()
      expect(online.wrapper.find('[aria-label="Notification"]').exists()).toBe(true)
      expect(online.wrapper.find('[aria-label="Favorite"]').exists()).toBe(true)
      const game = online.wrapper.find('.v-list-item-subtitle')
      // The category is favorite, its notification only covers other streams
      expect(game.html()).toContain(mdiStar)
      expect(game.html()).not.toContain(mdiBell)
      online.wrapper.unmount()

      const notified = mountItem(onlineItem({ id: '9' }), {}, state)
      await flushPromises()
      expect(notified.wrapper.find('.v-list-item-subtitle').html()).toContain(mdiBell)
      expect(notified.wrapper.find('.diagonal-cut').exists()).toBe(true)
      notified.wrapper.unmount()

      const offline = mountItem(offlineItem(), {}, state)
      await flushPromises()
      expect(offline.wrapper.find('[aria-label="Notification"]').exists()).toBe(true)
      expect(offline.wrapper.find('[aria-label="Favorite"]').exists()).toBe(true)
      offline.wrapper.unmount()

      const all = mountItem(offlineItem(), {}, { ...state, notificationType: 'all' })
      await flushPromises()
      expect(all.wrapper.find('[aria-label="Notification"]').exists()).toBe(false)
    })
    it('Render offline and followed streams', async () => {
      for (const item of [offlineItem(), streamItem({ verified: true })]) {
        const { wrapper } = mountItem(item)
        await flushPromises()

        expect(wrapper.find('img').attributes('alt')).toBe('Profile image from Alpha')
        expect(wrapper.find('link[rel="prefetch"]').attributes('href')).toBe('https://profile/alpha.png')
        expect(wrapper.find('.v-list-item-subtitle').text()).toBe('Offline')
        expect(wrapper.find('.text-red').exists()).toBe(false)
        expect(wrapper.find('.v-list-item-title').html().includes(mdiCheckDecagram)).toBe(item.verified)
        wrapper.unmount()
      }
    })
    it('Render videos with duration and age', async () => {
      const { wrapper } = mountItem(videoItem(), { parent: streamItem({ verified: true }) })
      await flushPromises()

      expect(wrapper.find('img').attributes('src')).toBe('https://preview/video-290x163.125')
      expect(wrapper.find('.start-at-content').text()).toBe('01:02:03')
      expect(wrapper.findAll('.v-list-item-subtitle').map((subtitle) => subtitle.text())).toStrictEqual([
        'Video title',
        '2 days',
      ])
      // The verified flag comes from the parent stream
      expect(wrapper.find('.v-list-item-title').html()).toContain(mdiCheckDecagram)
    })
    it('Render clips with duration and age', async () => {
      const { wrapper } = mountItem(clipItem())
      await flushPromises()

      expect(wrapper.find('img').attributes('src')).toBe('https://preview/clip.jpg')
      expect(wrapper.find('.start-at-content').text()).toBe('30s')
      expect(wrapper.findAll('.v-list-item-subtitle').map((subtitle) => subtitle.text())).toStrictEqual([
        'Clip title',
        '3 hours',
      ])
    })
    it('Render content without duration or preview', async () => {
      const { wrapper } = mountItem(clipItem({ duration: 0, previewImage: undefined, title: undefined }))
      await flushPromises()

      expect(wrapper.find('.start-at-content').text()).toBe('')
      expect(wrapper.find('link[rel="prefetch"]').exists()).toBe(false)

      await wrapper.setProps({ item: videoItem({ duration: 0, previewImage: undefined }) })
      expect(wrapper.find('.start-at-content').text()).toBe('')
    })
  })

  describe('Click', () => {
    it('Emit the click with the middle button flag', async () => {
      const item = onlineItem()
      const { wrapper } = mountItem(item)

      await wrapper.find('.list-item').trigger('click')
      await wrapper.find('.list-item').trigger('mousedown', { button: 1 })

      expect(wrapper.emitted('itemClick')).toStrictEqual([[{ item, middle: false }], [{ item, middle: true }]])
    })
  })

  describe('Context menu', () => {
    it('List every action of an online stream', async () => {
      const { wrapper } = mountItem(onlineItem())
      await flushPromises()
      await openMenu(wrapper)

      expect(menuTitles()).toStrictEqual([
        'Add favorite',
        'Add favorite category',
        'Enable notification',
        'Notify category',
        'Add to group',
        'Category',
        'Videos',
        'Clips',
      ])
    })
    it('Hide actions disabled by props or settings', async () => {
      const { wrapper } = mountItem(offlineItem(), { disableNotificationMenu: true, disableCategoryMenu: true })
      await flushPromises()
      await openMenu(wrapper)
      expect(menuTitles()).toStrictEqual(['Videos', 'Clips'])
      wrapper.unmount()

      const none = mountItem(onlineItem({ gameId: undefined }), {}, { notificationType: 'none' })
      await flushPromises()
      await openMenu(none.wrapper)
      expect(menuTitles()).toStrictEqual(['Add favorite', 'Videos', 'Clips'])
    })
    it('Toggle favorite, favorite category and notification', async () => {
      const { wrapper, system } = mountItem(onlineItem())
      await flushPromises()

      for (const [add, remove] of [
        ['Add favorite', 'Remove favorite'],
        ['Add favorite category', 'Remove favorite category'],
        ['Enable notification', 'Disable notification'],
      ]) {
        await openMenu(wrapper)
        await clickMenu(add)
        await openMenu(wrapper)
        expect(menuTitles()).toContain(remove)
      }
      expect(system.favorites).toStrictEqual([{ type: 'twitch', id: '1' }])
      expect(system.categoryFavorites).toStrictEqual([{ type: 'twitch', id: 'game-1', name: 'Minecraft' }])
      expect(system.notifications).toStrictEqual([{ type: 'twitch', id: '1' }])

      for (const remove of ['Remove favorite', 'Remove favorite category', 'Disable notification']) {
        await openMenu(wrapper)
        await clickMenu(remove)
      }
      expect(system.favorites).toStrictEqual([])
      expect(system.categoryFavorites).toStrictEqual([])
      expect(system.notifications).toStrictEqual([])
    })
    it('Ignore favorite categories without a game name', async () => {
      const { wrapper, system } = mountItem(onlineItem({ game: undefined }))
      await flushPromises()
      await openMenu(wrapper)
      await clickMenu('Add favorite category')

      expect(system.categoryFavorites).toStrictEqual([])
    })
    it('Remove a favorite category of a stream without game name', async () => {
      const { wrapper, system } = mountItem(
        onlineItem({ game: undefined }),
        {},
        { categoryFavorites: [{ type: 'twitch', id: 'game-1', name: 'Minecraft' }] }
      )
      await flushPromises()
      await openMenu(wrapper)
      await clickMenu('Remove favorite category')

      expect(system.categoryFavorites).toStrictEqual([])
    })
    it('Emit the dialogs, open the category and the contents', async () => {
      const item = onlineItem()
      const { wrapper, system } = mountItem(item)
      await flushPromises()

      await openMenu(wrapper)
      await clickMenu('Notify category')
      await openMenu(wrapper)
      await clickMenu('Add to group')
      expect(wrapper.emitted('menuItemCategoryNotificationClick')).toStrictEqual([[item]])
      expect(wrapper.emitted('menuItemGroupStreamClick')).toStrictEqual([[item]])

      await openMenu(wrapper)
      await clickMenu('Category')
      expect(system.view).toBe('categories')
      expect(system.viewData).toStrictEqual({ categoryId: 'game-1' })

      await openMenu(wrapper)
      await clickMenu('Videos')
      expect(wrapper.emitted('menuItemClick')).toStrictEqual([[{ type: 'video', item }]])
      expect(wrapper.emitted('update:detailItem')).toStrictEqual([[item]])

      // While on details the context menu is disabled
      await wrapper.setProps({ detailItem: item })
      await openMenu(wrapper)
      expect(menuTitles()).toStrictEqual([])
      await wrapper.setProps({ detailItem: undefined })

      await openMenu(wrapper)
      await clickMenu('Clips')
      expect(wrapper.emitted('menuItemClick')![1]).toStrictEqual([{ type: 'clip', item }])
    })
    it('Close with escape and focus the item again', async () => {
      const { wrapper } = mountItem(onlineItem())
      await flushPromises()
      await openMenu(wrapper)
      const list = bodyFindAll('.v-overlay--active .v-list')[0]

      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      expect(menuTitles()).toStrictEqual([])
      expect(document.activeElement).toBe(wrapper.find('.list-item').element)
      expect(wrapper.emitted('update:menuShow')!.at(-1)).toStrictEqual([undefined])
    })
    it('Stay closed when the context menu is disabled', async () => {
      const { wrapper } = mountItem(onlineItem(), { disableContextMenu: true })
      await flushPromises()
      await openMenu(wrapper)

      expect(menuTitles()).toStrictEqual([])
      expect(wrapper.emitted('update:menuShow')).toBeUndefined()
    })
  })
})
