import { describe, expect, it, vi } from 'vitest'
import type { DOMWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import AuthContent from '@/components/auth/AuthContent.vue'
import type { AccountStoreType } from '@/store/system/types/systemStoreType.ts'
import { getTestPlugins, localesEnvironment, mockedStore } from '@tests/__utils__/util.ts'
import type { Mock } from '@vitest/spy'
import useSystemStore from '@/store/system/useSystemStore.ts'
import AppBusiness from '@/services/business/appBusiness'
import AuthActions from '@/components/auth/AuthActions.vue'

vi.mock('@/services/business/appBusiness', () => ({
  default: {
    auth: vi.fn(),
  },
}))

const authAppBusinessMock = AppBusiness.auth as Mock<typeof AppBusiness.auth>

describe('AuthContent.vue', () => {
  it('Using AuthActions component', () => {
    const wrapper = mount(AuthContent, { global: { plugins: getTestPlugins() } })

    expect(wrapper.findComponent(AuthActions).exists()).toBe(true)
  })
  it('Show asking for authentication', async () => {
    await localesEnvironment(
      (dictionary) => {
        const wrapper = mount(AuthContent, { global: { plugins: getTestPlugins() } })

        expect(wrapper.text()).toContain(dictionary.authMandatoryMessage)
      },
      {
        en: {
          authMandatoryMessage: 'We need to authenticate to proceed',
        },
        'pt-BR': {
          authMandatoryMessage: 'Precisamos autenticar para prosseguir',
        },
      }
    )
  })
  it('Show twitch authentication warning about token expiration', async () => {
    await localesEnvironment(
      (dictionary) => {
        const wrapper = mount(AuthContent, { global: { plugins: getTestPlugins() } })

        expect(wrapper.text()).toContain(dictionary.twitchExpireMessage)
      },
      {
        en: {
          twitchExpireMessage: '* Twitch authentication by default lasts 60 days',
        },
        'pt-BR': {
          twitchExpireMessage: '* Autenticação da Twitch por padrão dura 60 dias',
        },
      }
    )
  })
  it('Click on authentication buttons', async () => {
    const wrapper = mount(AuthContent, { global: { plugins: getTestPlugins() } })

    const system = mockedStore(useSystemStore)

    const buttonAuthTypes: {
      [key in AccountStoreType]: {
        element: DOMWrapper<Element>
      }
    } = {
      twitch: {
        element: wrapper.find('[data-testid="twitch-auth"]'),
      },
    }

    for (const [key, { element }] of Object.entries(buttonAuthTypes)) {
      const accountType = key as AccountStoreType

      system.loading.mockClear()
      system.loaded.mockClear()
      system.addAccount.mockClear()
      system.fetchAccounts.mockClear()

      authAppBusinessMock.mockImplementation(() =>
        Promise.resolve({
          token: 'tokenTest',
          user: {
            type: accountType,
            id: 'id',
            name: 'name',
            login: 'login',
            avatarUrl: 'https://some-domain/avatar.png',
          },
        })
      )
      await element.trigger('click')

      expect(system.loading).toHaveBeenCalledTimes(2)
      expect(system.loaded).toHaveBeenCalledTimes(2)
      expect(system.addAccount).toHaveBeenCalledOnce()
      expect(system.addAccount).toHaveBeenCalledWith({
        type: accountType,
        accountId: 'id',
        name: 'name',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar.png',
        token: 'tokenTest',
      })
      expect(system.fetchAccounts).toHaveBeenCalledOnce()
    }
  })
})
