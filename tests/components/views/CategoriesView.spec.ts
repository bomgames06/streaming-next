import { describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { mdiBell, mdiStar } from '@mdi/js'
import CategoriesView from '@/components/views/categories/CategoriesView.vue'
import CategoriesList from '@/components/listCategories/CategoriesList.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import CategoryNotificationDialog from '@/components/categoryNotificationDialog/CategoryNotificationDialog.vue'
import emitter from '@/events'
import { bodyFindAll, bodyFindByText, mountWithStore, settle } from '@tests/__utils__/util'
import { twitchServer, type TwitchServerData } from '@tests/__utils__/twitchServer'
import { page } from '@tests/__utils__/http'
import { account, apiGame, apiSearchCategory, apiStream } from '@tests/__utils__/fixtures'

const serverData: TwitchServerData = {
  topGames: [
    apiGame({ id: 'g1', name: 'Minecraft', box_art_url: 'https://box/mc-{width}x{height}.jpg' }),
    apiGame({ id: 'g2', name: 'Zelda', box_art_url: 'https://box/zelda-{width}x{height}.jpg' }),
  ],
  games: [
    apiGame({ id: 'g1', name: 'Minecraft' }),
    apiGame({ id: 'g3', name: 'Among Us' }),
    apiGame({ id: 'g9', name: 'Tetris' }),
  ],
  categoryStreams: [
    apiStream({ user_id: '1', user_name: 'Alpha', user_login: 'alpha' }),
    apiStream({ user_id: '1', user_name: 'Alpha', user_login: 'alpha' }),
    apiStream({ user_id: '2', user_name: 'Bravo', user_login: 'bravo' }),
  ],
  searchCategories: [
    apiSearchCategory({ id: 's2', name: 'Minecraft Legends', box_art_url: 'https://box/legends-52x72.jpg' }),
    apiSearchCategory({ id: 's1', name: 'Minecraft Dungeons', box_art_url: 'https://box/dungeons-52x72.jpg' }),
  ],
}

async function mountView(options?: {
  state?: Record<string, unknown>
  data?: TwitchServerData
  props?: Record<string, unknown>
}) {
  fakeBrowser.runtime.onMessage.addListener(() => undefined)
  const server = twitchServer({ ...serverData, ...options?.data })
  const result = mountWithStore(CategoriesView, {
    props: options?.props,
    state: { accounts: { twitch: account() }, notificationType: 'partial', view: 'categories', ...options?.state },
  })
  await settle()
  return { ...result, ...server }
}
function categoryNames(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper
    .findAll('.category-item-title')
    .filter((title) => title.isVisible())
    .map((title) => title.text())
}
function streamNames(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper.findAllComponents(StreamListItem).map((item) => item.props('item').name)
}

describe('CategoriesView.vue', () => {
  it('Render the top categories and fetch more', async () => {
    const { wrapper, http, system, data } = await mountView({ data: { cursor: 'next' } })

    expect(categoryNames(wrapper)).toStrictEqual(['Minecraft', 'Zelda'])
    expect(wrapper.find('.v-img').exists()).toBe(true)
    expect(http.find('/games/top')[0].query.get('first')).toBe('99')
    expect(system.loadingCount).toBe(0)

    // Repeated categories between pages show once
    data.topGames = [apiGame({ id: 'g2', name: 'Zelda' }), apiGame({ id: 'g4', name: 'Fortnite' })]
    await wrapper.find('.v-btn.mt-2').trigger('click')
    await settle()

    expect(http.find('/games/top')[1].query.get('after')).toBe('next')
    expect(categoryNames(wrapper)).toStrictEqual(['Minecraft', 'Zelda', 'Fortnite'])
    expect(wrapper.text()).not.toContain('Search more')
  })
  it('Show the loading and the empty state', async () => {
    const { wrapper } = await mountView({ data: { topGames: [] } })

    expect(wrapper.text()).toContain('No categories')
  })
  it('Go back to the streams without account', async () => {
    const { system, http } = await mountView({ state: { accounts: {} } })

    expect(system.view).toBe('streams')
    expect(http.requests).toHaveLength(0)
  })
  it('Search categories by name after the debounce', async () => {
    const { wrapper, http, system } = await mountView()

    system.categoryNameFilterComp = 'mine'
    await settle()
    expect(http.find('/search/categories')).toHaveLength(0)
    await settle(520)

    expect(http.find('/search/categories')[0].query.toString()).toBe('query=mine&first=99')
    expect(categoryNames(wrapper)).toStrictEqual(['Minecraft Dungeons', 'Minecraft Legends'])
    // Searched categories have the size on the url
    expect(wrapper.findComponent(CategoriesList).html()).toContain('https://box/dungeons-150x207.jpg')
    expect(wrapper.text()).not.toContain('Search more')
  })
  it('Open a category from the view data and show its streams', async () => {
    const { wrapper, http, system } = await mountView({ props: { categoryId: 'g1' } })

    expect(http.find('/games')[0].query.toString()).toBe('id=g1')
    expect(categoryNames(wrapper)).toStrictEqual(['Minecraft'])
    expect(system.headerAppBarView).toBe('categoryStreams')
    expect(http.find('/streams')[0].query.toString()).toBe('game_id=g1&first=20')
    // Repeated streams show once
    expect(streamNames(wrapper)).toStrictEqual(['Alpha', 'Bravo'])
    // The filters wait for the category to close
    expect(wrapper.find('button[aria-label="Favorites"]').attributes('disabled')).toBeDefined()

    // Clicking it again goes back to the list
    await wrapper.find('.category-list > .v-list-item').trigger('click')
    await settle()
    expect(system.headerAppBarView).toBeUndefined()
    expect(categoryNames(wrapper)).toStrictEqual(['Minecraft', 'Zelda'])
  })
  it('Keep only the latest categories response', async () => {
    const { wrapper, http, system } = await mountView()
    const releases: (() => void)[] = []
    const hold = (items: ReturnType<typeof apiSearchCategory>[]) => () =>
      new Promise<{ data: unknown }>((resolve) =>
        releases.push(() => resolve({ data: { data: items, pagination: {} } }))
      )
    http.get('/search/categories', hold([apiSearchCategory({ id: 'old', name: 'Old' })]))
    http.get('/games/top', hold([apiGame({ id: 'old-top', name: 'Old top' })]))

    // A search followed by a refresh of the top categories
    system.categoryNameFilterComp = 'old'
    await settle(520)
    system.categoryNameFilterComp = ''
    await settle(520)
    http.get('/games/top', page([apiGame({ id: 'new', name: 'New' })]))
    emitter.emit('refresh')
    await settle()
    releases.forEach((release) => release())
    await settle()

    expect(categoryNames(wrapper)).toStrictEqual(['New'])
  })
  it('Skip favorites and notifications without account', async () => {
    const { http } = await mountView({
      state: {
        accounts: {},
        categoryFavorites: [{ type: 'twitch', id: 'g3', name: 'Among Us' }],
        categoryNotifications: [{ id: 'n', name: 'tetris', streams: [] }],
      },
    })

    expect(http.requests).toHaveLength(0)
  })
  it('Ignore a view category without account', async () => {
    const { http } = await mountView({ props: { categoryId: 'g1' }, state: { accounts: {} } })

    expect(http.find('/games')).toHaveLength(0)
  })
  it('Show favorite and notification categories', async () => {
    const { wrapper, system, http } = await mountView({
      state: {
        categoryFavorites: [{ type: 'twitch', id: 'g3', name: 'Among Us' }],
        categoryNotifications: [{ id: 'n', name: 'tetris', streams: [] }],
      },
    })
    expect(http.find('/games').map((request) => request.query.toString())).toStrictEqual(['id=g3', 'name=tetris'])

    await wrapper.find('button[aria-label="Favorites"]').trigger('click')
    expect(system.showCategoryFavoritesComp).toBe(true)
    expect(categoryNames(wrapper)).toStrictEqual(['Among Us'])
    expect(wrapper.text()).not.toContain('Search more')

    await wrapper.find('button[aria-label="Notifications"]').trigger('click')
    expect(categoryNames(wrapper)).toStrictEqual(['Among Us', 'Tetris'])

    // The name filter applies to them
    system.categoryNameFilterComp = 'tet'
    await nextTick()
    expect(categoryNames(wrapper)).toStrictEqual(['Tetris'])
    await settle(520)

    // Following the store changes
    system.addFavoriteCategory({ type: 'twitch', id: 'g1', name: 'Minecraft' })
    system.categoryNameFilterComp = ''
    await settle(520)
    expect(http.find('/games').at(-2)!.query.getAll('id')).toStrictEqual(['g3', 'g1'])
    expect(categoryNames(wrapper)).toStrictEqual(['Among Us', 'Minecraft', 'Tetris'])

    system.cleanCategoryFavorite()
    system.cleanCategoryNotification()
    await settle()
    expect(categoryNames(wrapper)).toStrictEqual([])
  })
  it('Refresh the list unless a category is open', async () => {
    const { wrapper, http } = await mountView()

    emitter.emit('refresh')
    await settle()
    expect(http.find('/games/top')).toHaveLength(2)

    await wrapper.find('.category-list > .v-list-item').trigger('click')
    await settle()
    emitter.emit('refresh')
    await settle()
    expect(http.find('/games/top')).toHaveLength(2)
    // The open category refreshes its streams instead
    expect(http.find('/streams')).toHaveLength(2)

    wrapper.unmount()
    emitter.emit('refresh')
    await settle()
    expect(http.find('/games/top')).toHaveLength(2)
  })
  it('Hide the notification dialog when notifications are disabled', async () => {
    const { wrapper } = await mountView({ state: { notificationType: 'none' } })

    expect(wrapper.find('button[aria-label="Category"]').exists()).toBe(false)
  })
  it('Open the category notification dialog', async () => {
    const { wrapper } = await mountView()

    await wrapper.find('button[aria-label="Category"]').trigger('click')
    await settle()

    expect(bodyFindByText('.v-card-title', 'Game notifications')).toBeTruthy()
  })
})

describe('CategoriesList.vue', () => {
  const items = [
    {
      type: 'twitch' as const,
      id: 'g1',
      name: 'Minecraft',
      boxArtUrl: 'https://box/mc-{width}x{height}.jpg',
      igdbId: '',
    },
    { type: 'twitch' as const, id: 's1', name: 'Zelda', imageUrl: 'https://box/zelda-52x72.jpg' },
  ]

  async function mountList(state?: Record<string, unknown>, props?: Record<string, unknown>) {
    const server = twitchServer({ ...serverData, cursor: 'next' })
    const result = mountWithStore(CategoriesList, {
      props: { items, ...props },
      state: { accounts: { twitch: account() }, notificationType: 'partial', ...state },
    })
    await settle()
    return { ...result, ...server }
  }
  async function openMenu(wrapper: Awaited<ReturnType<typeof mountList>>['wrapper'], index = 0) {
    await wrapper.findAll('.category-list > .v-list-item')[index].trigger('contextmenu', { clientX: 1, clientY: 2 })
    await settle()
  }
  function menuTitles() {
    return bodyFindAll('.v-overlay--active .v-list-item-title').map((item) => item.textContent)
  }

  it('Show the loading state', async () => {
    const { wrapper } = await mountList({}, { items: [], loading: true })

    expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
  })
  it('Render the images and the badges', async () => {
    const { wrapper } = await mountList({
      categoryFavorites: [{ type: 'twitch', id: 'g1', name: 'Minecraft' }],
      categoryNotifications: [
        { id: 'a', name: 'minecraft', streams: [] },
        { id: 'b', name: 'Zelda', streams: [{ type: 'twitch', id: '1' }] },
      ],
    })
    const [minecraft, zelda] = wrapper.findAll('.category-list > .v-list-item')

    expect(minecraft.html()).toContain('https://box/mc-150x207.jpg')
    expect(zelda.html()).toContain('https://box/zelda-150x207.jpg')
    expect(minecraft.find('[aria-label="Favorite"]').html()).toContain(mdiStar)
    expect(minecraft.find('[aria-label="Notification"]').html()).toContain(mdiBell)
    expect(minecraft.find('.diagonal-cut').exists()).toBe(false)
    expect(zelda.find('[aria-label="Favorite"]').exists()).toBe(false)
    expect(zelda.find('.diagonal-cut').exists()).toBe(true)
  })
  it('Open a category, filter its streams by language and fetch more', async () => {
    const { wrapper, http, system } = await mountList({ languageCategoryStream: ['en'] })

    await wrapper.find('.category-list > .v-list-item').trigger('click')
    await settle()
    expect(system.languageCategoryStream).toStrictEqual([])
    expect(wrapper.emitted('update:categorySelected')).toStrictEqual([[items[0]]])
    expect(system.headerAppBarView).toBe('categoryStreams')
    expect(streamNames(wrapper)).toStrictEqual(['Alpha', 'Bravo'])
    // The other categories are hidden
    expect(wrapper.findAll('.category-list > .v-list-item').map((item) => item.isVisible())).toStrictEqual([
      true,
      false,
    ])

    await wrapper.find('.mt-3 .v-btn').trigger('click')
    await settle()
    expect(http.find('/streams').at(-1)!.query.get('after')).toBe('next')

    system.setLanguageCategoryStream(['pt', 'ko'])
    await settle()
    expect(http.find('/streams').at(-1)!.query.getAll('language')).toStrictEqual(['pt', 'ko'])
    // The same languages do not fetch again
    const count = http.find('/streams').length
    system.setLanguageCategoryStream(['pt', 'ko'])
    await settle()
    expect(http.find('/streams')).toHaveLength(count)
  })
  it('Ignore language changes without a category', async () => {
    const { http, system } = await mountList()

    system.setLanguageCategoryStream(['pt'])
    await settle()

    expect(http.find('/streams')).toHaveLength(0)
  })
  it('Add and remove a favorite category from the menu', async () => {
    const { wrapper, system } = await mountList()

    await openMenu(wrapper)
    expect(menuTitles()).toStrictEqual(['Add favorite', 'Notify category'])
    bodyFindByText('.v-overlay--active .v-list-item', 'Add favorite')!.click()
    await settle()
    expect(system.categoryFavorites).toStrictEqual([{ type: 'twitch', id: 'g1', name: 'Minecraft' }])
    // The focus goes back to the category
    expect(document.activeElement).toBe(wrapper.find('.category-list > .v-list-item').element)

    await openMenu(wrapper)
    bodyFindByText('.v-overlay--active .v-list-item', 'Remove favorite')!.click()
    await settle()
    expect(system.categoryFavorites).toStrictEqual([])
  })
  it('Open the notification dialog of a category from the menu', async () => {
    const { wrapper } = await mountList({ notificationType: 'all' }, { items: [items[1]] })

    await openMenu(wrapper)
    bodyFindByText('.v-overlay--active .v-list-item', 'Notify category')!.click()
    await settle()

    const dialog = wrapper.findComponent(CategoryNotificationDialog)
    expect(dialog.props('categoryItem')).toStrictEqual(items[1])
    dialog.vm.$emit('update:modelValue', true)
    await nextTick()
    expect(wrapper.findComponent(CategoryNotificationDialog).exists()).toBe(true)
    dialog.vm.$emit('update:modelValue', false)
    await settle()
    expect(wrapper.findComponent(CategoryNotificationDialog).exists()).toBe(false)
  })
  it('Close the menu with escape and hide it without notifications', async () => {
    const { wrapper } = await mountList({ notificationType: 'none' })

    await openMenu(wrapper)
    expect(menuTitles()).toStrictEqual(['Add favorite'])
    bodyFindAll('.v-overlay--active .v-list')[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await settle()
    expect(menuTitles()).toStrictEqual([])
  })
  it('Disable the menu while a category is open', async () => {
    const { wrapper } = await mountList({}, { categorySelected: items[0] })

    await openMenu(wrapper)

    expect(menuTitles()).toStrictEqual([])
    expect(wrapper.find('.category-list > .v-list-item').classes()).not.toContain('v-list-item--disabled')
  })
})
