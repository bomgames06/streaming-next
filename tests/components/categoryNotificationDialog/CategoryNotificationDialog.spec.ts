import { describe, expect, it, vi } from 'vitest'
import type { Mock } from '@vitest/spy'
import { mdiCameraOff, mdiCheckboxMarked } from '@mdi/js'
import { VAutocomplete, VCheckbox, VCombobox } from 'vuetify/components'
import CategoryNotificationDialog from '@/components/categoryNotificationDialog/CategoryNotificationDialog.vue'
import CategoryNotificationListItem from '@/components/categoryNotificationDialog/CategoryNotificationListItem.vue'
import AppBusiness from '@/services/business/appBusiness'
import { bodyFind, bodyFindAll, bodyFindByText, mountWithStore, settle } from '@tests/__utils__/util'
import { account, categoryItem, streamItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/appBusiness', () => ({
  default: {
    searchCategories: vi.fn(),
    getStreamersFollowed: vi.fn(),
  },
}))
const searchCategoriesMock = AppBusiness.searchCategories as Mock<typeof AppBusiness.searchCategories>
const getStreamersFollowedMock = AppBusiness.getStreamersFollowed as Mock<typeof AppBusiness.getStreamersFollowed>

const streams = [
  streamItem({ id: '2', name: 'Bravo', profileImage: 'https://p/b.png' }),
  streamItem({ id: '1', name: 'Alpha', profileImage: 'https://p/a.png' }),
]
const notifications = [
  { id: 'n2', name: 'Zelda', imageUrl: 'https://box/zelda.jpg', streams: [] },
  {
    id: 'n1',
    name: 'Minecraft',
    streams: [
      { type: 'twitch', id: '1' },
      { type: 'twitch', id: 'unknown' },
    ],
  },
]
const baseState = { accounts: { twitch: account() }, categoryNotifications: notifications }

async function mountDialog(props?: Record<string, unknown>, state?: Record<string, unknown>) {
  const result = mountWithStore(CategoryNotificationDialog, {
    props: { modelValue: true, ...props },
    state: { ...baseState, ...state },
  })
  await settle()
  return result
}
function titles() {
  return bodyFindAll('.category-notification-list-item .v-list-item-title').map((title) => title.textContent)
}
async function click(element: Element | null | undefined) {
  ;(element as HTMLElement).click()
  await settle()
}

describe('CategoryNotificationDialog.vue', () => {
  describe('Without category', () => {
    it('Fetch the followed streams when opened without them', async () => {
      getStreamersFollowedMock.mockResolvedValueOnce(streams)
      const { system } = await mountDialog({}, { accountsCacheStreams: { twitch: [streams[0]] } })

      expect(getStreamersFollowedMock).toHaveBeenCalledWith(system.accounts.twitch)
      expect(system.accountsCacheStreams.twitch).toStrictEqual(streams)
    })
    it('Use no streams without a valid account', async () => {
      getStreamersFollowedMock.mockClear()
      const { wrapper } = await mountDialog({}, { accounts: { twitch: account({ invalid: true }) } })

      await click(bodyFindByText('.category-notification-list-item', 'MinecraftStreams: 2'))
      await click(bodyFindByText('.v-list-item', 'Add stream'))

      expect(getStreamersFollowedMock).not.toHaveBeenCalled()
      expect(wrapper.findComponent(VAutocomplete).props('items')).toStrictEqual([])
    })
    it('List the notifications ordered by name', async () => {
      const { wrapper } = await mountDialog({ streams })

      expect(bodyFindByText('.v-card-title', 'Game notifications')).toBeTruthy()
      expect(titles()).toStrictEqual(['Minecraft', 'Zelda'])
      expect(
        bodyFindAll('.category-notification-list-item .v-list-item-subtitle').map((value) => value.textContent)
      ).toStrictEqual(['Streams: 2', 'Stream: All'])
      const [minecraft, zelda] = wrapper.findAllComponents(CategoryNotificationListItem)
      expect(minecraft.html()).toContain(mdiCameraOff)
      expect(zelda.find('.v-img').exists()).toBe(true)
    })
    it('Show a message without notifications', async () => {
      await mountDialog({ streams }, { categoryNotifications: [] })

      expect(bodyFind('.v-overlay--active')!.textContent).toContain('No notifications')
    })
    it('Search categories while typing and add the selected one', async () => {
      searchCategoriesMock.mockResolvedValue({
        items: [
          { type: 'twitch', id: 'g', name: 'Minecraft Dungeons', imageUrl: 'https://box/md.jpg' },
          { type: 'twitch', id: 'g2', name: 'Minecraft Dungeons', imageUrl: 'https://box/md2.jpg' },
          { type: 'twitch', id: 'a', name: 'Among Us', imageUrl: 'https://box/au.jpg' },
        ],
      })
      const { wrapper, system } = mountWithStore(CategoryNotificationDialog, {
        props: { modelValue: true, streams },
        state: baseState,
      })
      const combobox = wrapper.findComponent(VCombobox)

      // Debounced by 500ms
      combobox.vm.$emit('update:search', '  dungeons ')
      await settle()
      expect(searchCategoriesMock).not.toHaveBeenCalled()
      await new Promise((resolve) => setTimeout(resolve, 520))
      await settle()
      expect(searchCategoriesMock).toHaveBeenCalledWith(system.accounts.twitch, 'dungeons', undefined, 100)
      // Unique names ordered by name
      expect(combobox.props('items')!.map((item: { name: string }) => item.name)).toStrictEqual([
        'Among Us',
        'Minecraft Dungeons',
      ])

      combobox.vm.$emit('update:modelValue', combobox.props('items')![1])
      await settle()
      await click(bodyFind('.v-overlay--active .v-card-text > .v-row button[aria-label="Add"]'))
      expect(system.categoryNotifications.find((value) => value.name === 'Minecraft Dungeons')).toMatchObject({
        imageUrl: 'https://box/md.jpg',
        streams: [],
      })

      // Clearing the search clears the options
      combobox.vm.$emit('update:search', '')
      await settle()
      await new Promise((resolve) => setTimeout(resolve, 520))
      expect(wrapper.findComponent(VCombobox).props('items')).toStrictEqual([])
    })
    it('Add a typed category matching a searched one', async () => {
      searchCategoriesMock.mockResolvedValue({
        items: [{ type: 'twitch', id: 'g', name: 'Among Us', imageUrl: 'https://box/au.jpg' }],
      })
      const { wrapper, system } = await mountDialog({ streams })
      const combobox = wrapper.findComponent(VCombobox)

      combobox.vm.$emit('update:search', 'among')
      await new Promise((resolve) => setTimeout(resolve, 520))
      await settle()
      // A typed text with the same name becomes the searched category
      combobox.vm.$emit('update:modelValue', '  among us  ')
      await settle()
      await combobox.find('input').trigger('keydown', { key: 'Enter' })
      await settle()

      expect(system.categoryNotifications.find((value) => value.name === 'Among Us')).toMatchObject({
        imageUrl: 'https://box/au.jpg',
      })
    })
    it('Add a free text category and ignore empty values', async () => {
      const { wrapper, system } = await mountDialog({ streams })
      const combobox = wrapper.findComponent(VCombobox)

      combobox.vm.$emit('update:modelValue', null)
      await settle()
      await combobox.find('input').trigger('keydown', { key: 'Enter' })
      expect(system.categoryNotifications).toHaveLength(2)

      combobox.vm.$emit('update:modelValue', 'Tetris')
      await settle()
      await combobox.find('input').trigger('keydown', { key: 'Enter' })
      expect(system.categoryNotifications.find((value) => value.name === 'Tetris')).toMatchObject({
        imageUrl: undefined,
        streams: [],
      })
    })
    it('Expand a notification to manage its streams', async () => {
      const { wrapper, system } = await mountDialog({ streams })

      await click(bodyFindByText('.category-notification-list-item', 'MinecraftStreams: 2'))
      expect(
        bodyFindAll<HTMLElement>('.category-notification-list-item').map((item) => item.style.display)
      ).toStrictEqual(['', 'none'])
      expect(
        bodyFindAll('.stream-category-content .v-list-item-title').map((value) => value.textContent)
      ).toStrictEqual(['Alpha'])

      await click(bodyFindByText('.v-list-item', 'Add stream'))
      const autocomplete = wrapper.findComponent(VAutocomplete)
      expect(autocomplete.props('items')!.map((item: { name: string }) => item.name)).toStrictEqual(['Alpha', 'Bravo'])
      autocomplete.vm.$emit('update:modelValue', streams[0])
      await settle()
      await click(bodyFind('.v-overlay--active .v-list button[aria-label="Add"]'))
      expect(system.categoryNotifications.find((value) => value.id === 'n1')!.streams).toContainEqual({
        type: 'twitch',
        id: '2',
      })

      await click(bodyFindByText('.v-list-item', 'Add stream'))
      await wrapper.findComponent(VAutocomplete).find('input').trigger('keydown', { key: 'Enter' })
      await click(bodyFind('.v-overlay--active button[aria-label="Close"]'))
      expect(bodyFindByText('.v-list-item', 'Add stream')).toBeTruthy()

      await click(bodyFindAll('.stream-category-content .v-btn')[0])
      expect(system.categoryNotifications.find((value) => value.id === 'n1')!.streams).toStrictEqual([
        { type: 'twitch', id: 'unknown' },
        { type: 'twitch', id: '2' },
      ])

      await click(bodyFindByText('.category-notification-list-item', 'MinecraftStreams: 2'))
      expect(bodyFindAll('.stream-category-content')).toHaveLength(0)
    })
    it('Delete a notification', async () => {
      const { wrapper, system } = await mountDialog({ streams })
      await click(bodyFindByText('.category-notification-list-item', 'MinecraftStreams: 2'))

      wrapper.findAllComponents(CategoryNotificationListItem)[0].vm.$emit('delete')
      await settle()

      expect(system.categoryNotifications.map((value) => value.id)).toStrictEqual(['n2'])
      expect(bodyFindAll('.stream-category-content')).toHaveLength(0)
      expect(titles()).toStrictEqual(['Zelda'])
    })
    it('Delete with the button without expanding the notification', async () => {
      const { system } = await mountDialog({ streams })

      await click(bodyFindAll('.category-notification-list-item .v-btn')[0])

      expect(system.categoryNotifications.map((value) => value.id)).toStrictEqual(['n2'])
      expect(bodyFindByText('.v-list-item', 'Add stream')).toBeFalsy()
    })
    it('Close with the button and reset when reopened', async () => {
      const { wrapper } = await mountDialog({ streams })
      await click(bodyFindByText('.category-notification-list-item', 'MinecraftStreams: 2'))

      await click(bodyFindByText('.v-overlay--active .v-card-actions .v-btn', 'Close'))
      expect(wrapper.emitted('update:modelValue')).toStrictEqual([[false]])
      await wrapper.setProps({ modelValue: false })
      await wrapper.setProps({ modelValue: true })
      await settle()

      expect(bodyFindAll('.stream-category-content')).toHaveLength(0)
    })
    it('Close the dialog with escape on the field', async () => {
      const { wrapper } = await mountDialog({ streams })

      await wrapper.findComponent(VCombobox).find('input').trigger('keydown', { key: 'Escape' })
      await settle()

      expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    })
    it('Close only the category menu with escape on an option', async () => {
      searchCategoriesMock.mockResolvedValue({
        items: [{ type: 'twitch', id: 'a', name: 'Among Us', imageUrl: 'https://box/au.jpg' }],
      })
      const { wrapper } = await mountDialog({ streams })
      const combobox = wrapper.findComponent(VCombobox)
      combobox.vm.$emit('update:search', 'among')
      await new Promise((resolve) => setTimeout(resolve, 520))
      combobox.vm.$emit('update:menu', true)
      await settle()
      const option = bodyFindByText('.v-overlay--active .v-list-item', 'Among Us')!
      expect(option.querySelector('.v-img')).toBeTruthy()

      option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await settle()

      expect(combobox.props('menu')).toBe(false)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('With a stream', () => {
    it('Toggle the stream on the notifications that apply to it', async () => {
      const { wrapper, system } = await mountDialog({ streams, streamItem: streams[1] })

      expect(bodyFind('.v-overlay--active .v-card-text')!.textContent).toContain('Alpha')
      // Every notification for all streams or that includes it
      const items = wrapper.findAllComponents(CategoryNotificationListItem)
      expect(items.map((item) => item.props('category').name)).toStrictEqual(['Minecraft', 'Zelda'])
      expect(items.map((item) => item.attributes('aria-selected'))).toStrictEqual(['true', 'false'])
      expect(items[0].html()).toContain(mdiCheckboxMarked)

      await click(items[1].element)
      expect(system.categoryNotifications.find((value) => value.id === 'n2')!.streams).toStrictEqual([
        { type: 'twitch', id: '1' },
      ])
      await click(wrapper.findAllComponents(CategoryNotificationListItem)[0].element)
      expect(system.categoryNotifications.find((value) => value.id === 'n1')!.streams).toStrictEqual([
        { type: 'twitch', id: 'unknown' },
      ])
      // Not related anymore, it leaves the list
      expect(
        wrapper.findAllComponents(CategoryNotificationListItem).map((item) => item.props('category').name)
      ).toStrictEqual(['Zelda'])
    })
    it('Add a new notification already with the stream', async () => {
      const { wrapper, system } = await mountDialog({ streams, streamItem: streams[1] })
      const combobox = wrapper.findComponent(VCombobox)

      combobox.vm.$emit('update:modelValue', 'Tetris')
      await settle()
      await combobox.find('input').trigger('keydown', { key: 'Enter' })

      expect(system.categoryNotifications.find((value) => value.name === 'Tetris')!.streams).toStrictEqual([
        { type: 'twitch', id: '1' },
      ])
    })
  })

  describe('With a category', () => {
    const category = categoryItem({ name: 'Minecraft', boxArtUrl: 'https://box/mc-{width}x{height}.jpg' })

    it('Show the category and its streams', async () => {
      const { wrapper } = await mountDialog({ streams, categoryItem: category })

      expect(bodyFind('.v-overlay--active .v-card-text')!.textContent).toContain('Minecraft')
      expect(wrapper.findComponent({ name: 'VImg' }).props('src')).toBe('https://box/mc-30x42.jpg')
      expect(wrapper.findComponent(VCheckbox).props('modelValue')).toBe(false)
      expect(
        bodyFindAll('.stream-category-content .v-list-item-title').map((value) => value.textContent)
      ).toStrictEqual(['Alpha'])
    })
    it('Add a stream to the category notification', async () => {
      const { wrapper, system } = await mountDialog({ streams, categoryItem: category }, { categoryNotifications: [] })
      expect(bodyFind('.v-overlay--active')!.textContent).toContain('No notifications')
      const autocomplete = wrapper.findComponent(VAutocomplete)
      expect(autocomplete.props('items')!.map((item: { name: string }) => item.name)).toStrictEqual(['Alpha', 'Bravo'])

      // Nothing to add yet
      await autocomplete.find('input').trigger('keydown', { key: 'Enter' })
      expect(system.categoryNotifications).toStrictEqual([])

      autocomplete.vm.$emit('update:modelValue', streams[0])
      await settle()
      await click(bodyFind('.v-overlay--active button[aria-label="Add"]'))

      expect(system.categoryNotifications).toMatchObject([
        { name: 'Minecraft', imageUrl: 'https://box/mc-52x72.jpg', streams: [{ type: 'twitch', id: '2' }] },
      ])
      await click(bodyFindAll('.stream-category-content .v-btn')[0])
      expect(system.categoryNotifications[0].streams).toStrictEqual([])
      // Without streams it notifies every stream
      expect(wrapper.findComponent(VCheckbox).props('modelValue')).toBe(true)
    })
    it('Toggle every stream of the category', async () => {
      const { wrapper, system } = await mountDialog({ streams, categoryItem: category })
      const checkbox = wrapper.findComponent(VCheckbox)

      checkbox.vm.$emit('update:modelValue', true)
      await settle()
      expect(system.categoryNotifications.find((value) => value.id === 'n1')!.streams).toStrictEqual([])

      checkbox.vm.$emit('update:modelValue', false)
      await settle()
      expect(system.categoryNotifications.map((value) => value.id)).toStrictEqual(['n2'])

      // Nothing to remove anymore
      checkbox.vm.$emit('update:modelValue', null)
      await settle()
      expect(system.categoryNotifications.map((value) => value.id)).toStrictEqual(['n2'])

      checkbox.vm.$emit('update:modelValue', true)
      await settle()
      expect(system.categoryNotifications.find((value) => value.name === 'Minecraft')).toMatchObject({
        imageUrl: 'https://box/mc-{width}x{height}.jpg',
        streams: [],
      })
    })
    it('Build the image of searched categories', async () => {
      const searched = {
        type: 'twitch' as const,
        id: 'g',
        name: 'Among Us',
        imageUrl: 'https://box/au-{width}x{height}.jpg',
      }
      const { wrapper, system } = await mountDialog({ streams, categoryItem: searched }, { categoryNotifications: [] })

      expect(wrapper.findComponent({ name: 'VImg' }).props('src')).toBe('https://box/au-30x42.jpg')
      wrapper.findComponent(VCheckbox).vm.$emit('update:modelValue', true)
      await settle()
      expect(system.categoryNotifications[0].imageUrl).toBe('https://box/au-{width}x{height}.jpg')
    })
    it('Close only the stream menu with escape on an option, the dialog on the field', async () => {
      const { wrapper } = await mountDialog({ streams, categoryItem: category })
      const autocomplete = wrapper.findComponent(VAutocomplete)

      autocomplete.vm.$emit('update:menu', true)
      await settle()
      const option = bodyFindByText('.v-overlay--active .v-list-item', 'Alpha')!
      expect(option.querySelector('.v-avatar')).toBeTruthy()
      option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await settle()
      expect(autocomplete.props('menu')).toBe(false)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()

      await autocomplete.find('input').trigger('keydown', { key: 'Escape' })
      await settle()
      expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    })
  })
})
