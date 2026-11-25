import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mdiArrowDownThick, mdiArrowUpThick } from '@mdi/js'
import StreamsAppBarView from '@/components/views/streams/StreamsAppBarView.vue'
import CategoriesAppBarView from '@/components/views/categories/CategoriesAppBarView.vue'
import SearchAppBarView from '@/components/views/search/SearchAppBarView.vue'
import StreamOrderMenu from '@/components/listStream/StreamOrderMenu.vue'
import StreamListVideosAppBarView from '@/components/listStream/appBarView/StreamListVideosAppBarView.vue'
import StreamListClipsAppBarView from '@/components/listStream/appBarView/StreamListClipsAppBarView.vue'
import CategoriesListItemAppBarView from '@/components/listCategories/appBarView/CategoriesListItemAppBarView.vue'
import emitter from '@/events'
import { bodyFind, bodyFindAll, bodyFindByText, mountWithStore } from '@tests/__utils__/util'

async function click(element: Element | null | undefined) {
  ;(element as HTMLElement).click()
  await flushPromises()
}
function escape(element: Element | null) {
  element!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  return flushPromises()
}

describe('app bar views', () => {
  it('Streams: filter, refresh and loading state', async () => {
    const refresh = vi.fn()
    emitter.on('refresh', refresh)
    const { wrapper, system } = mountWithStore(StreamsAppBarView)

    await wrapper.find('input').setValue('  alpha ')
    expect(system.streamFilter).toBe('alpha')

    const button = wrapper.find('button[aria-label="Refresh"]')
    await button.trigger('click')
    expect(refresh).toHaveBeenCalledOnce()

    system.refreshing()
    await nextTick()
    expect(button.attributes('disabled')).toBeDefined()
    emitter.off('refresh', refresh)
  })
  it('Categories: filter and refresh', async () => {
    const refresh = vi.fn()
    emitter.on('refresh', refresh)
    const { wrapper, system } = mountWithStore(CategoriesAppBarView)

    await wrapper.find('input').setValue('mine ')
    expect(system.categoryNameFilterComp).toBe('mine')
    await wrapper.find('button[aria-label="Refresh"]').trigger('click')
    expect(refresh).toHaveBeenCalledOnce()
    emitter.off('refresh', refresh)
  })
  it('Search: required search field', async () => {
    const { wrapper, system } = mountWithStore(SearchAppBarView)

    await wrapper.find('input').setValue(' alpha ')
    expect(system.streamNameFilter).toBe('alpha')
    expect(wrapper.find('label').text()).toBe('Search')
  })

  describe('StreamOrderMenu', () => {
    it('Show the selected order with its direction', async () => {
      const { wrapper, system } = mountWithStore(StreamOrderMenu, {
        state: { streamOrder: 'name', streamOrderSort: true },
      })

      await click(wrapper.find('button[aria-label="Sort"]').element)
      const name = bodyFind('[data-testid="stream-order-name"]')!
      expect(name.getAttribute('aria-label')).toBe('Name - Ascending')
      expect(name.getAttribute('aria-selected')).toBe('true')
      expect(name.innerHTML).toContain(mdiArrowUpThick)
      expect(bodyFind('[data-testid="stream-order-view"]')!.getAttribute('aria-label')).toBe('View')

      await click(name)
      expect(system.streamOrderSort).toBe(false)
      expect(name.getAttribute('aria-label')).toBe('Name - Descending')
      expect(name.innerHTML).toContain(mdiArrowDownThick)

      await click(bodyFind('[data-testid="stream-order-game"]'))
      expect(system.streamOrder).toBe('game')

      await escape(bodyFind('[data-testid="stream-order-game"]')!.closest('.v-list'))
    })
  })

  it('Videos: change the video order', async () => {
    const { wrapper, system } = mountWithStore(StreamListVideosAppBarView, { state: { videoOrder: 'time' } })

    await click(wrapper.find('button[aria-label="Sort"]').element)
    expect(bodyFind('[aria-label="Time"]')!.getAttribute('aria-selected')).toBe('true')

    for (const [label, value] of [
      ['Trending', 'trending'],
      ['View', 'views'],
      ['Time', 'time'],
    ]) {
      await click(bodyFind(`[aria-label="${label}"]`))
      expect(system.videoOrder).toBe(value)
    }
    await escape(bodyFind('[aria-label="Time"]')!.closest('.v-list'))
  })
  it('Clips: change the clip period', async () => {
    const { wrapper, system } = mountWithStore(StreamListClipsAppBarView, { state: { clipPeriod: '7d' } })
    expect(wrapper.text()).toContain('7 days')

    await wrapper.find('.v-field').trigger('mousedown')
    await flushPromises()
    expect(bodyFindAll('.v-list-item-title').map((item) => item.textContent)).toStrictEqual([
      '24 hours',
      '7 days',
      '30 days',
      'All',
    ])
    await click(bodyFindByText('.v-list-item', '30 days'))
    expect(system.clipPeriod).toBe('30d')

    // An empty selection falls back to 24 hours
    wrapper.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', null)
    expect(system.clipPeriod).toBe('24h')
  })
  it('Category streams: choose languages and refresh', async () => {
    const refresh = vi.fn()
    emitter.on('refresh', refresh)
    const { wrapper, system } = mountWithStore(CategoriesListItemAppBarView, { state: { languageCategoryStream: [] } })

    await wrapper.find('.v-field').trigger('mousedown')
    await flushPromises()
    expect(bodyFindAll('.v-list-item-title').map((item) => item.textContent)).toStrictEqual([
      'Portuguese',
      'English',
      'Korean',
      'Japanese',
      'Russian',
      'Chinese',
    ])
    await click(bodyFindByText('.v-list-item', 'Portuguese'))
    expect(system.languageCategoryStream).toStrictEqual(['pt'])
    expect(wrapper.find('.v-select__selection').text()).toBe('Portuguese')

    await click(bodyFindByText('.v-list-item', 'Korean'))
    expect(system.languageCategoryStream).toStrictEqual(['pt', 'ko'])
    expect(wrapper.find('.v-select__selection').text()).toBe('2 Languages')

    await wrapper.find('button[aria-label="Refresh"]').trigger('click')
    expect(refresh).toHaveBeenCalledOnce()
    emitter.off('refresh', refresh)
  })
})
