import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import Mousetrap from 'mousetrap'
import { mdiAccount, mdiCheckBold, mdiCloseThick, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
import LoadingLayout from '@/layouts/loading/LoadingLayout.vue'
import SimpleLayout from '@/layouts/simple/SimpleLayout.vue'
import AppLayout from '@/layouts/app/AppLayout.vue'
import AuthActions from '@/components/auth/AuthActions.vue'
import AppBusiness from '@/services/business/appBusiness'
import vuetify from '@/plugins/vuetify'
import i18n from '@/plugins/i18n'
import { bodyFindAll, bodyFindByText, mountWithStore } from '@tests/__utils__/util'
import { account } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/appBusiness', () => ({
  default: { getSelfUser: vi.fn(), revoke: vi.fn(() => Promise.resolve()) },
}))

function hasIcon(root: { html(): string } | Element, path: string) {
  const html = root instanceof Element ? root.innerHTML : root.html()
  return html.includes(`d="${path}"`)
}
async function openMenu(button: HTMLElement) {
  button.click()
  await flushPromises()
}
function resetPreferences() {
  vuetify.theme.change('light')
  i18n.global.locale.value = 'en'
}

describe('layouts', () => {
  describe('LoadingLayout', () => {
    it('Show the loading, loaded and error states', async () => {
      const { wrapper } = mountWithStore(LoadingLayout)
      expect(wrapper.find('h1').text()).toBe('Streaming Next')
      expect(wrapper.text()).toContain('Loading')
      expect(wrapper.find('.v-progress-circular').exists()).toBe(true)

      await wrapper.setProps({ loaded: true })
      expect(wrapper.text()).toContain('Loaded')
      expect(hasIcon(wrapper, mdiCheckBold)).toBe(true)

      await wrapper.setProps({ error: true })
      expect(wrapper.find('span.text-error').text()).toBe('Error loading application')
      expect(hasIcon(wrapper, mdiCloseThick)).toBe(true)
    })
  })

  describe('SimpleLayout', () => {
    it('Render the slot and the loading bar', async () => {
      const { wrapper, system } = mountWithStore(SimpleLayout, { slots: { default: '<p class="content">Body</p>' } })

      expect(wrapper.find('.content').text()).toBe('Body')
      expect(wrapper.find('.v-progress-linear').exists()).toBe(false)

      system.loading()
      await nextTick()
      expect(wrapper.find('.v-progress-linear').exists()).toBe(true)
    })
    it('Toggle the theme', async () => {
      resetPreferences()
      const { wrapper, system } = mountWithStore(SimpleLayout)
      const button = wrapper.find('button[aria-label="Light theme"]')
      expect(hasIcon(button.element, mdiWeatherSunny)).toBe(true)

      await button.trigger('click')

      expect(system.dark).toBe(true)
      expect(vuetify.theme.global.name.value).toBe('dark')
      const darkButton = wrapper.find('button[aria-label="Dark theme"]')
      expect(hasIcon(darkButton.element, mdiWeatherNight)).toBe(true)
      resetPreferences()
    })
    it('Change the language from the menu', async () => {
      resetPreferences()
      const { wrapper, system } = mountWithStore(SimpleLayout, { state: { language: 'en' } })

      await openMenu(wrapper.find('button[aria-label="Language"]').element as HTMLElement)
      const options = bodyFindAll('[role="option"]')
      expect(options.map((option) => option.textContent?.trim())).toStrictEqual(['English', 'Português - Brasil'])
      expect(options[0].getAttribute('aria-selected')).toBe('true')

      options[1].click()
      await flushPromises()

      expect(system.language).toBe('pt-BR')
      expect(i18n.global.locale.value).toBe('pt-BR')
      expect(wrapper.find('button[aria-label="Idiomas"]').exists()).toBe(true)

      // Escape closes the menu
      bodyFindAll('.v-list')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()
      resetPreferences()
    })
  })

  describe('AppLayout', () => {
    function mountApp(state?: Record<string, unknown>) {
      return mountWithStore(AppLayout, {
        state: { accounts: { twitch: account() }, view: 'streams', ...state },
        slots: {
          appbar: '<span class="appbar-slot">App bar</span>',
          default: '<p class="default-slot">Content</p>',
          sidebar: '<nav class="sidebar-slot">Sidebar</nav>',
        },
      })
    }
    function profileButton() {
      return bodyFindAll<HTMLButtonElement>('.profile-button')[0]
    }

    it('Render the account, the slots and the screen reader shortcuts', async () => {
      const { wrapper, system } = mountApp()

      expect(wrapper.find('.appbar-slot').exists()).toBe(true)
      expect(wrapper.find('.default-slot').exists()).toBe(true)
      expect(profileButton().textContent).toContain('Me')
      expect(profileButton().querySelector('img')?.getAttribute('src') ?? 'pending').toBeTruthy()
      const shortcuts = wrapper.find('[aria-live="polite"]').text()
      expect(shortcuts).toContain('Open Categories view')
      expect(shortcuts).toContain('Open Search view')

      system.accounts.twitch!.invalid = true
      system.accounts.twitch!.avatarUrl = undefined
      system.loading()
      await nextTick()
      expect(wrapper.find('[aria-live="polite"]').text()).not.toContain('Open Categories view')
      expect(hasIcon(profileButton(), mdiAccount)).toBe(true)
      expect(wrapper.find('.v-progress-linear').exists()).toBe(true)
    })
    it('Show the sidebar slot only when opened', async () => {
      const { wrapper } = mountApp()
      expect(wrapper.find('.sidebar-slot').exists()).toBe(false)

      await wrapper.find('.v-app-bar-nav-icon').trigger('click')

      expect(wrapper.find('.sidebar-slot').exists()).toBe(true)

      // The drawer closes itself, like clicking outside of it
      wrapper.findComponent({ name: 'VNavigationDrawer' }).vm.$emit('update:modelValue', false)
      await nextTick()
      expect(wrapper.find('.sidebar-slot').exists()).toBe(false)
    })
    it('Change the view with the keyboard shortcuts', async () => {
      const { system } = mountApp()

      Mousetrap.trigger('alt+2')
      expect(system.view).toBe('categories')
      Mousetrap.trigger('alt+3')
      expect(system.view).toBe('search')
      Mousetrap.trigger('alt+s')
      expect(system.view).toBe('settings')
      Mousetrap.trigger('alt+1')
      expect(system.view).toBe('streams')

      // Categories and search need a valid account
      system.accounts.twitch!.invalid = true
      Mousetrap.trigger('alt+2')
      Mousetrap.trigger('alt+3')
      expect(system.view).toBe('streams')
    })
    it('Unbind the shortcuts on unmount', () => {
      const { wrapper, system } = mountApp()
      wrapper.unmount()

      Mousetrap.trigger('alt+s')

      expect(system.view).toBe('streams')
    })
    it('Open settings, switch theme and language from the profile menu', async () => {
      resetPreferences()
      const { system } = mountApp({ language: 'en' })

      await openMenu(profileButton())
      expect(bodyFindByText('.v-list-item-title', 'Accounts')).toBeTruthy()
      bodyFindByText('.v-list-item', 'Light')!.click()
      await flushPromises()
      expect(system.dark).toBe(true)
      expect(bodyFindByText('.v-list-item', 'Dark')).toBeTruthy()

      bodyFindByText('.v-list-item', 'Language')!.click()
      await flushPromises()
      bodyFindByText('[role="option"]', 'Português - Brasil')!.click()
      await flushPromises()
      expect(system.language).toBe('pt-BR')
      i18n.global.locale.value = 'en'
      await flushPromises()

      bodyFindByText('.v-list-item', 'Settings')!.click()
      await flushPromises()
      expect(system.view).toBe('settings')

      await openMenu(profileButton())
      const menuList = bodyFindByText('.v-list-item-title', 'Accounts')!.closest('.v-list')!
      // Already on settings
      expect(
        Array.from(menuList.querySelectorAll('.v-list-item')).map((item) => item.textContent?.trim())
      ).not.toContain('Settings')
      menuList.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()
      expect(menuList.isConnected && menuList.closest('.v-overlay--active')).toBeFalsy()
      resetPreferences()
    })
    it('Add the account authenticated from the accounts menu', async () => {
      const { wrapper, system } = mountApp()
      vi.mocked(AppBusiness.getSelfUser).mockResolvedValue({ type: 'twitch', id: 'new', name: 'New', login: 'new' })
      const user = { type: 'twitch' as const, id: 'new', name: 'New', login: 'new' }
      await openMenu(profileButton())
      bodyFindByText('.v-list-item', 'Accounts')!.click()
      await flushPromises()
      expect(bodyFindByText('.v-list-item-title', 'Me')).toBeTruthy()

      wrapper.findComponent(AuthActions).vm.$emit('authenticated', { token: 'new-token', user })
      await flushPromises()

      expect(system.accounts.twitch).toMatchObject({ accountId: 'new', token: 'new-token' })
      expect(system.screen).toBe('home')
      expect(wrapper.findComponent(AuthActions).props('authenticating')).toBe(false)
    })
  })
})
