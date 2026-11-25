import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { VRadioGroup, VSelect, VSwitch } from 'vuetify/components'
import SearchView from '@/components/views/search/SearchView.vue'
import SettingsView from '@/components/views/settings/SettingsView.vue'
import StreamListItem from '@/components/listStream/StreamListItem.vue'
import vuetify from '@/plugins/vuetify'
import i18n from '@/plugins/i18n'
import { mountWithStore, settle } from '@tests/__utils__/util'
import { twitchServer } from '@tests/__utils__/twitchServer'
import { account, apiSearchChannel, apiUser } from '@tests/__utils__/fixtures'
import { QUICK_DIALOG_COMMAND } from '@/types/quickDialogTypes'

describe('SearchView.vue', () => {
  async function mountView(state?: Record<string, unknown>) {
    const server = twitchServer({
      cursor: 'next',
      searchChannels: [
        apiSearchChannel({ id: '2', display_name: 'Zulu', broadcaster_login: 'zulu', is_live: false }),
        apiSearchChannel({ id: '1', display_name: 'Alpha', broadcaster_login: 'alpha' }),
      ],
      users: [apiUser({ id: '1', broadcaster_type: 'partner' })],
    })
    const result = mountWithStore(SearchView, {
      state: { accounts: { twitch: account() }, view: 'search', streamNameFilter: 'old', ...state },
    })
    await settle()
    return { ...result, ...server }
  }
  function names(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
    return wrapper
      .findAllComponents(StreamListItem)
      .map((item) => `${item.props('item').status}:${item.props('item').name}`)
  }

  it('Ask to fill the search field', async () => {
    const { wrapper, system } = await mountView()

    // The previous search is cleared when the view opens
    expect(system.streamNameFilter).toBe('')
    expect(wrapper.text()).toContain('Fill in the "Search" field to search for channels')
  })
  it('Search channels after the debounce ordered by name', async () => {
    const { wrapper, http, system } = await mountView()

    system.streamNameFilterComp = 'a'
    await settle()
    expect(http.find('/search/channels')).toHaveLength(0)
    await settle(520)

    expect(http.find('/search/channels')[0].query.toString()).toBe('query=a&first=100')
    expect(names(wrapper)).toStrictEqual(['online:Alpha', 'offline:Zulu'])
    // The context menu has no notification items and the view count is hidden
    expect(wrapper.findComponent(StreamListItem).props('disableNotificationMenu')).toBe(true)
    expect(wrapper.find('.text-red').exists()).toBe(false)
    expect(system.loadingCount).toBe(0)

    await wrapper.find('.v-btn.mt-2').trigger('click')
    await settle()
    expect(http.find('/search/channels')[1].query.get('after')).toBe('next')
    expect(names(wrapper)).toStrictEqual(['online:Alpha', 'offline:Zulu', 'online:Alpha', 'offline:Zulu'])
    expect(wrapper.text()).not.toContain('Search more')
  })
  it('Clear the results with an empty search', async () => {
    const { wrapper, system } = await mountView()
    system.streamNameFilterComp = 'a'
    await settle(520)

    system.streamNameFilterComp = ''
    await settle(520)

    expect(names(wrapper)).toStrictEqual([])
    expect(wrapper.text()).toContain('Fill in the "Search" field')
  })
  it('Keep only the latest search results', async () => {
    const { wrapper, http, system } = await mountView()
    let release: () => void = () => undefined
    http.get(
      '/search/channels',
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { data: [apiSearchChannel({ display_name: 'Old' })], pagination: {} } })
        })
    )
    system.streamNameFilterComp = 'old'
    await settle(520)

    http.get('/search/channels', { data: { data: [apiSearchChannel({ display_name: 'New' })], pagination: {} } })
    system.streamNameFilterComp = 'new'
    await settle(520)
    release()
    await settle()

    expect(names(wrapper)).toStrictEqual(['online:New'])
  })
  it('Go back to the streams when the account is removed', async () => {
    const { system } = await mountView({ accounts: {} })

    expect(system.view).toBe('streams')
  })
  it('Cancel the pending search on unmount', async () => {
    const { wrapper, http, system } = await mountView()

    system.streamNameFilterComp = 'a'
    wrapper.unmount()
    await settle(520)

    expect(http.find('/search/channels')).toHaveLength(0)
  })
  it('Do not search without account', async () => {
    const { http, system } = await mountView()
    system.accounts = {}
    system.setView('search')

    system.streamNameFilterComp = 'a'
    await settle(520)

    expect(http.find('/search/channels')).toHaveLength(0)
    expect(system.loadingCount).toBe(0)
  })
})

describe('SettingsView.vue', () => {
  function mountView(state?: Record<string, unknown>, shortcut?: string) {
    vi.spyOn(browser.commands, 'getAll').mockResolvedValue(
      (shortcut === undefined ? [] : [{ name: QUICK_DIALOG_COMMAND, shortcut }]) as never
    )
    return mountWithStore(SettingsView, {
      state: {
        language: 'en',
        notificationType: 'partial',
        favorites: [{ type: 'twitch', id: '1' }],
        categoryFavorites: [{ type: 'twitch', id: 'g', name: 'G' }],
        notifications: [{ type: 'twitch', id: '1' }],
        categoryNotifications: [{ id: 'n', name: 'G', streams: [] }],
        ...state,
      },
    })
  }
  function button(wrapper: ReturnType<typeof mountView>['wrapper'], label: string) {
    return wrapper.find(`button[aria-label="${label}"]`)
  }

  it('Render the settings and the app info', async () => {
    const { wrapper } = mountView({}, 'Ctrl+Shift+Space')
    await settle()

    expect(wrapper.find('h2').text()).toBe('Settings')
    expect(wrapper.text()).toContain(`Version: ${import.meta.env.__APP_VERSION__}`)
    expect(wrapper.text()).toContain('Quick list shortcut: Ctrl+Shift+Space')
    expect(wrapper.findComponent(VSelect).props('items')).toStrictEqual(['en', 'pt-BR'])
    expect(wrapper.findComponent(VSelect).text()).toContain('English')
  })
  it('Show when the quick dialog shortcut is not set', async () => {
    const { wrapper } = mountView({}, '')
    await settle()

    expect(wrapper.text()).toContain('Quick list shortcut not set')
  })
  it('Open the shortcut settings of the browser', async () => {
    const { wrapper } = mountView()
    const createSpy = vi.spyOn(browser.tabs, 'create')

    await wrapper.find('button.v-btn--size-small').trigger('click')
    expect(createSpy).toHaveBeenCalledWith({ url: 'chrome://extensions/shortcuts' })

    // Firefox has its own API
    const openShortcutSettings = vi.fn(() => Promise.resolve())
    Object.assign(browser.commands, { openShortcutSettings })
    await wrapper.find('button.v-btn--size-small').trigger('click')
    expect(openShortcutSettings).toHaveBeenCalledOnce()
    delete (browser.commands as { openShortcutSettings?: unknown }).openShortcutSettings
  })
  it('Change the language, the notification type and the switches', async () => {
    const { wrapper, system } = mountView({ dark: false, showAlwaysOfflines: false })

    wrapper.findComponent(VSelect).vm.$emit('update:modelValue', 'pt-BR')
    expect(system.language).toBe('pt-BR')
    expect(i18n.global.locale.value).toBe('pt-BR')
    system.setLanguage('en', i18n.global as never)

    const radio = wrapper.findComponent(VRadioGroup)
    radio.vm.$emit('update:modelValue', 'all')
    expect(system.notificationType).toBe('all')
    // An empty value keeps the current type
    radio.vm.$emit('update:modelValue', null)
    expect(system.notificationType).toBe('all')

    const [dark, offlines] = wrapper.findAllComponents(VSwitch)
    dark.vm.$emit('update:modelValue', true)
    expect(system.dark).toBe(true)
    expect(vuetify.theme.global.name.value).toBe('dark')
    dark.vm.$emit('update:modelValue', false)
    offlines.vm.$emit('update:modelValue', true)
    expect(system.showAlwaysOfflines).toBe(true)
  })
  it('Clear favorites and notifications', async () => {
    const { wrapper, system } = mountView()

    await button(wrapper, 'Clear favorites').trigger('click')
    await button(wrapper, 'Clear favorite categories').trigger('click')
    await button(wrapper, 'Clear notifications').trigger('click')
    await button(wrapper, 'Clear category notifications').trigger('click')

    expect(system.favorites).toStrictEqual([])
    expect(system.categoryFavorites).toStrictEqual([])
    expect(system.notifications).toStrictEqual([])
    expect(system.categoryNotifications).toStrictEqual([])
    for (const label of [
      'Clear favorites',
      'Clear favorite categories',
      'Clear notifications',
      'Clear category notifications',
    ])
      expect(button(wrapper, label).attributes('disabled')).toBeDefined()
  })
  it('Hide the clear buttons by the notification type', async () => {
    const { wrapper, system } = mountView({ notificationType: 'all' })
    expect(button(wrapper, 'Clear notifications').exists()).toBe(false)
    expect(button(wrapper, 'Clear category notifications').exists()).toBe(true)

    system.setNotificationType('none')
    await nextTick()
    expect(button(wrapper, 'Clear category notifications').exists()).toBe(false)
  })
  it('Open GitHub and the support page, in background with the middle button', async () => {
    const { wrapper } = mountView()
    const createSpy = vi.spyOn(browser.tabs, 'create')

    await button(wrapper, 'GitHub').trigger('click')
    await button(wrapper, 'GitHub').trigger('mousedown', { button: 1 })
    await button(wrapper, `Support ${import.meta.env.VITE_BUY_ME_A_COFFE_NAME}`).trigger('click')
    await button(wrapper, `Support ${import.meta.env.VITE_BUY_ME_A_COFFE_NAME}`).trigger('mousedown', { button: 1 })

    expect(createSpy.mock.calls).toStrictEqual([
      [{ url: import.meta.env.VITE_GITHUB_URL, active: true }],
      [{ url: import.meta.env.VITE_GITHUB_URL, active: false }],
      [{ url: import.meta.env.VITE_BUY_ME_A_COFFE_URL, active: true }],
      [{ url: import.meta.env.VITE_BUY_ME_A_COFFE_URL, active: false }],
    ])

    // Hovering colors the buttons
    await button(wrapper, 'GitHub').trigger('mouseenter')
    await settle()
    expect(button(wrapper, 'GitHub').classes()).toContain('text-primary')
  })
})
