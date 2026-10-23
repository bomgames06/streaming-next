import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AppBarViewContent from '@/components/app/AppBarViewContent.vue'
import AppSidebarContent from '@/components/app/AppSidebarContent.vue'
import AppViewContent from '@/components/app/AppViewContent.vue'
import ViewContainer from '@/components/viewContainer/ViewContainer.vue'
import { bodyFindAll, mountWithStore } from '@tests/__utils__/util'
import { account } from '@tests/__utils__/fixtures'

function fake(name: string) {
  return { default: { name, props: ['categoryId'], render: () => h('div', { class: name }, name) } }
}
vi.mock('@/components/views/streams/StreamsView.vue', () => fake('StreamsView'))
vi.mock('@/components/views/categories/CategoriesView.vue', () => fake('CategoriesView'))
vi.mock('@/components/views/search/SearchView.vue', () => fake('SearchView'))
vi.mock('@/components/views/settings/SettingsView.vue', () => fake('SettingsView'))
vi.mock('@/components/views/streams/StreamsAppBarView.vue', () => fake('StreamsAppBarView'))
vi.mock('@/components/views/categories/CategoriesAppBarView.vue', () => fake('CategoriesAppBarView'))
vi.mock('@/components/views/search/SearchAppBarView.vue', () => fake('SearchAppBarView'))
vi.mock('@/components/listStream/appBarView/StreamListVideosAppBarView.vue', () => fake('VideosAppBar'))
vi.mock('@/components/listStream/appBarView/StreamListClipsAppBarView.vue', () => fake('ClipsAppBar'))
vi.mock('@/components/listCategories/appBarView/CategoriesListItemAppBarView.vue', () => fake('CategoryStreamsAppBar'))

describe('app components', () => {
  it('AppViewContent renders the current view with its data', async () => {
    const { wrapper, system } = mountWithStore(AppViewContent, { state: { view: 'streams' } })
    expect(wrapper.text()).toBe('StreamsView')

    for (const [view, text] of [
      ['search', 'SearchView'],
      ['settings', 'SettingsView'],
    ] as const) {
      system.setView(view)
      await nextTick()
      expect(wrapper.text()).toBe(text)
    }

    system.setView('categories', { categoryId: 'game-1' })
    await nextTick()
    expect(wrapper.findComponent({ name: 'CategoriesView' }).props('categoryId')).toBe('game-1')
  })

  it('AppBarViewContent prefers the custom header over the view header', async () => {
    const { wrapper, system } = mountWithStore(AppBarViewContent, { state: { view: 'streams' } })
    expect(wrapper.text()).toBe('StreamsAppBarView')

    system.setView('categories')
    await nextTick()
    expect(wrapper.text()).toBe('CategoriesAppBarView')
    system.setView('search')
    await nextTick()
    expect(wrapper.text()).toBe('SearchAppBarView')
    system.setView('settings')
    await nextTick()
    expect(wrapper.text()).toBe('')

    for (const [header, text] of [
      ['video', 'VideosAppBar'],
      ['clip', 'ClipsAppBar'],
      ['categoryStreams', 'CategoryStreamsAppBar'],
    ] as const) {
      system.setHeaderAppBarView(header)
      await nextTick()
      expect(wrapper.text()).toBe(text)
    }
  })

  describe('AppSidebarContent', () => {
    it('Show categories and search only with a valid account', async () => {
      const { wrapper, system } = mountWithStore(AppSidebarContent, {
        state: { view: 'streams', accounts: { twitch: account() } },
      })
      const labels = () => wrapper.findAll('[role="option"]').map((item) => item.attributes('aria-label'))
      expect(labels()).toStrictEqual(['Streams', 'Categories', 'Search', 'Settings'])
      expect(wrapper.find('[aria-label="Streams"]').attributes('aria-selected')).toBe('true')

      system.accounts.twitch!.invalid = true
      await nextTick()
      expect(labels()).toStrictEqual(['Streams', 'Settings'])
    })
    it('Open a view and close the sidebar', async () => {
      const { wrapper, system } = mountWithStore(AppSidebarContent, {
        props: { sidebar: true },
        state: { view: 'streams', accounts: { twitch: account() } },
      })

      for (const [label, view] of [
        ['Categories', 'categories'],
        ['Search', 'search'],
        ['Settings', 'settings'],
        ['Streams', 'streams'],
      ]) {
        await wrapper.find(`[aria-label="${label}"]`).trigger('click')
        expect(system.view).toBe(view)
      }
      // Without a parent listening the model keeps the local value, so only the first change is emitted
      expect(wrapper.emitted('update:sidebar')).toStrictEqual([[false]])
    })
    it('Show the view name as tooltip', async () => {
      const { wrapper } = mountWithStore(AppSidebarContent, { state: { view: 'streams' } })

      await wrapper.find('[aria-label="Settings"]').trigger('mouseenter')
      await flushPromises()

      expect(bodyFindAll('.v-tooltip').some((tooltip) => tooltip.textContent?.includes('Settings'))).toBe(true)
    })
  })

  it('ViewContainer renders the top and default slots', () => {
    const { wrapper } = mountWithStore(ViewContainer, {
      slots: { top: '<header class="top">Top</header>', default: '<p class="body">Body</p>' },
    })

    expect(wrapper.find('.top').text()).toBe('Top')
    expect(wrapper.find('.v-container .body').text()).toBe('Body')
  })
})
