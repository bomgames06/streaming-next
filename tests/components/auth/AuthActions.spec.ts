import { describe, expect, it, vi } from 'vitest'
import { getTestPlugins, localesEnvironment, mockedStore } from '@tests/__utils__/util.ts'
import type { DOMWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import AuthActions from '@/components/auth/AuthActions.vue'
import type { AccountDataStore, AccountStoreType } from '@/store/system/types/systemStoreType.ts'
import AuthActionsButton from '@/components/auth/AuthActionsButton.vue'
import useSystemStore from '@/store/system/useSystemStore.ts'
import { cloneDeep } from 'lodash'
import AppBusiness from '@/services/business/appBusiness'
import type { Mock } from '@vitest/spy'
import browser from 'webextension-polyfill'

vi.mock('@/services/business/appBusiness', () => ({
  default: {
    auth: vi.fn(),
    revoke: vi.fn(),
  },
}))

const authAppBusinessMock = AppBusiness.auth as Mock<typeof AppBusiness.auth>
const revokeAppBusinessMock = AppBusiness.revoke as Mock<typeof AppBusiness.revoke>

describe('AuthActions.vue', () => {
  it('Using AuthActions component', () => {
    const wrapper = mount(AuthActions, { global: { plugins: getTestPlugins() } })

    expect(wrapper.findComponent(AuthActionsButton).exists()).toBe(true)
  })
  describe('Button mode', () => {
    it('Render all account types without account', async () => {
      await localesEnvironment(
        (dictionary) => {
          const wrapper = mount(AuthActions, {
            props: {
              listItem: false,
            },
            global: { plugins: getTestPlugins() },
          })

          const buttonAuthTypes: {
            [key in AccountStoreType]: {
              text: string
              iconClass: string
              element: DOMWrapper<Element>
            }
          } = {
            twitch: {
              text: dictionary.twitchButtonText,
              iconClass: 'mdi-twitch',
              element: wrapper.find('button[data-testid="twitch-auth"]'),
            },
            youtube: {
              text: dictionary.youtubeButtonText,
              iconClass: 'mdi-youtube',
              element: wrapper.find('button[data-testid="youtube-auth"]'),
            },
          }

          Object.values(buttonAuthTypes).forEach(({ text, iconClass, element }) => {
            expect(element.exists()).toBe(true)
            expect(element.text()).toBe(text)
            expect(element.find(`i.${iconClass}.mdi.v-icon`).exists()).toBe(true)
          })
        },
        {
          en: {
            twitchButtonText: 'Authenticate on Twitch',
            youtubeButtonText: 'Authenticate on Youtube',
          },
          'pt-BR': {
            twitchButtonText: 'Autenticar na Twitch',
            youtubeButtonText: 'Autenticar no Youtube',
          },
        }
      )
    })
    it('Render all account types with account', async () => {
      const accounts: AccountDataStore = {
        twitch: {
          id: 'id',
          type: 'twitch',
          accountId: 'accountId',
          name: 'twitchAccountName',
          login: 'login',
          avatarUrl: 'https://some-domain/avatar.png',
          token: 'token',
          invalid: true,
        },
        youtube: {
          id: 'id',
          type: 'youtube',
          accountId: 'accountId',
          name: 'youtubeAccountName',
          login: 'login',
          avatarUrl: 'https://some-domain/avatar2.png',
          token: 'token',
          invalid: true,
        },
      }

      const wrapper = mount(AuthActions, {
        props: {
          listItem: false,
        },
        global: {
          plugins: getTestPlugins({
            pinia: {
              initialState: {
                System: {
                  accounts: cloneDeep(accounts),
                },
              },
            },
          }),
        },
      })

      const system = mockedStore(useSystemStore)

      const buttonAuthTypes: {
        [key in AccountStoreType]: {
          text: string
          iconClass: string
          avatarUrl: string
          element: DOMWrapper<Element>
          deleteElement: DOMWrapper<Element>
        }
      } = {
        twitch: {
          text: 'twitchAccountName',
          iconClass: 'mdi-twitch',
          avatarUrl: 'https://some-domain/avatar.png',
          element: wrapper.find('button[data-testid="twitch-auth"]'),
          deleteElement: wrapper.find('button[data-testid="twitch-auth-delete"]'),
        },
        youtube: {
          text: 'youtubeAccountName',
          iconClass: 'mdi-youtube',
          avatarUrl: 'https://some-domain/avatar2.png',
          element: wrapper.find('button[data-testid="youtube-auth"]'),
          deleteElement: wrapper.find('button[data-testid="youtube-auth-delete"]'),
        },
      }

      for (const [key, { text, iconClass, avatarUrl, element, deleteElement }] of Object.entries(buttonAuthTypes)) {
        const accountType = key as AccountStoreType

        expect(element.exists()).toBe(true)
        expect(element.text()).toBe(text)
        expect(element.find(`i.${iconClass}.mdi.v-icon`).exists()).toBe(true)
        expect(element.find(`i.mdi-close-circle.mdi.v-icon`).exists()).toBe(true)
        expect(deleteElement.exists()).toBe(true)
        expect(deleteElement.text()).toBe('')
        expect(deleteElement.find(`i.mdi-delete.mdi.v-icon`).exists()).toBe(true)

        const imgElement = element.find('img')
        expect(imgElement.exists()).toBe(true)
        expect(imgElement.attributes().src).toBe(avatarUrl)
        const accountIconNotFound = element.find('i.mdi-account.mdi.v-icon')
        expect(accountIconNotFound.exists()).toBe(false)

        system.$patch({
          accounts: {
            [accountType]: {
              ...cloneDeep(accounts[accountType]),
              avatarUrl: undefined,
            },
          },
        })
        await nextTick()

        const imgElementNotFound = element.find('img')
        expect(imgElementNotFound.exists()).toBe(false)
        const accountIcon = element.find('i.mdi-account.mdi.v-icon')
        expect(accountIcon.exists()).toBe(true)

        system.$patch({
          accounts: cloneDeep(accounts),
        })
        await nextTick()
      }
    })
  })
  describe('List item mode', () => {
    it('Render all account types without account', async () => {
      await localesEnvironment(
        (dictionary) => {
          const wrapper = mount(AuthActions, {
            props: {
              listItem: true,
            },
            global: { plugins: getTestPlugins() },
          })

          const buttonAuthTypes: {
            [key in AccountStoreType]: {
              text: string
              iconClass: string
              element: DOMWrapper<Element>
            }
          } = {
            twitch: {
              text: dictionary.twitchButtonText,
              iconClass: 'mdi-twitch',
              element: wrapper.find('div[data-testid="twitch-auth"].v-list-item'),
            },
            youtube: {
              text: dictionary.youtubeButtonText,
              iconClass: 'mdi-youtube',
              element: wrapper.find('div[data-testid="youtube-auth"].v-list-item'),
            },
          }

          Object.values(buttonAuthTypes).forEach(({ text, iconClass, element }) => {
            expect(element.exists()).toBe(true)
            expect(element.text()).toBe(text)
            expect(element.find(`i.${iconClass}.mdi.v-icon`).exists()).toBe(true)
          })
        },
        {
          en: {
            twitchButtonText: 'Authenticate on Twitch',
            youtubeButtonText: 'Authenticate on Youtube',
          },
          'pt-BR': {
            twitchButtonText: 'Autenticar na Twitch',
            youtubeButtonText: 'Autenticar no Youtube',
          },
        }
      )
    })
    it('Render all account types with account', async () => {
      const accounts: AccountDataStore = {
        twitch: {
          id: 'id',
          type: 'twitch',
          accountId: 'accountId',
          name: 'twitchAccountName',
          login: 'login',
          avatarUrl: 'https://some-domain/avatar.png',
          token: 'token',
          invalid: true,
        },
        youtube: {
          id: 'id',
          type: 'youtube',
          accountId: 'accountId',
          name: 'youtubeAccountName',
          login: 'login',
          avatarUrl: 'https://some-domain/avatar2.png',
          token: 'token',
          invalid: true,
        },
      }

      const wrapper = mount(AuthActions, {
        props: {
          listItem: true,
        },
        global: {
          plugins: getTestPlugins({
            pinia: {
              initialState: {
                System: {
                  accounts: cloneDeep(accounts),
                },
              },
            },
          }),
        },
      })

      const system = mockedStore(useSystemStore)

      const buttonAuthTypes: {
        [key in AccountStoreType]: {
          text: string
          iconClass: string
          avatarUrl: string
          element: DOMWrapper<Element>
          deleteElement: DOMWrapper<Element>
        }
      } = {
        twitch: {
          text: 'twitchAccountName',
          iconClass: 'mdi-twitch',
          avatarUrl: 'https://some-domain/avatar.png',
          element: wrapper.find('div[data-testid="twitch-auth"].v-list-item'),
          deleteElement: wrapper.find('button[data-testid="twitch-auth-delete"]'),
        },
        youtube: {
          text: 'youtubeAccountName',
          iconClass: 'mdi-youtube',
          avatarUrl: 'https://some-domain/avatar2.png',
          element: wrapper.find('div[data-testid="youtube-auth"].v-list-item'),
          deleteElement: wrapper.find('button[data-testid="youtube-auth-delete"]'),
        },
      }

      console.log(wrapper.html())

      for (const [key, { text, iconClass, avatarUrl, element, deleteElement }] of Object.entries(buttonAuthTypes)) {
        const accountType = key as AccountStoreType

        for (const status of [true, false]) {
          system.$patch({
            accounts: {
              [accountType]: {
                ...cloneDeep(accounts[accountType]),
                invalid: status,
              },
            },
          })
          await nextTick()

          expect(element.exists()).toBe(true)
          expect(element.text()).toBe(text)
          expect(element.find(`i.${iconClass}.mdi.v-icon`).exists()).toBe(true)
          expect(element.find(`i.mdi-close-circle.mdi.v-icon`).exists()).toBe(status)
          expect(deleteElement.text()).toBe('')
          expect(deleteElement.find(`i.mdi-${status ? 'delete' : 'logout'}.mdi.v-icon`).exists()).toBe(true)

          const imgElement = element.find('img')
          expect(imgElement.exists()).toBe(true)
          expect(imgElement.attributes().src).toBe(avatarUrl)
          const accountIconNotFound = element.find('i.mdi-account.mdi.v-icon')
          expect(accountIconNotFound.exists()).toBe(false)

          system.$patch({
            accounts: {
              [accountType]: {
                ...cloneDeep(accounts[accountType]),
                avatarUrl: undefined,
              },
            },
          })
          await nextTick()

          const imgElementNotFound = element.find('img')
          expect(imgElementNotFound.exists()).toBe(false)
          const accountIcon = element.find('i.mdi-account.mdi.v-icon')
          expect(accountIcon.exists()).toBe(true)

          system.$patch({
            accounts: cloneDeep(accounts),
          })
          await nextTick()
        }
      }
    })
  })
  it('Authenticate', async () => {
    const buttonAuthTypes: {
      [key in AccountStoreType]: {
        dataTestid: string
      }
    } = {
      twitch: {
        dataTestid: '[data-testid="twitch-auth"]',
      },
      youtube: {
        dataTestid: '[data-testid="youtube-auth"]',
      },
    }

    for (const [key, { dataTestid }] of Object.entries(buttonAuthTypes)) {
      const accountType = key as AccountStoreType

      for (const status of [false, true]) {
        const wrapper = mount(AuthActions, {
          props: {
            listItem: status,
          },
          global: { plugins: getTestPlugins() },
        })

        const system = mockedStore(useSystemStore)

        system.loading.mockClear()
        system.loaded.mockClear()
        authAppBusinessMock.mockClear()

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

        const element = wrapper.find(`${status ? 'div' : 'button'}${dataTestid}`)
        expect(element.exists()).toBe(true)
        await element.trigger('click')

        expect(system.loading).toHaveBeenCalledTimes(1)
        expect(system.loaded).toHaveBeenCalledTimes(1)

        expect(authAppBusinessMock).toHaveBeenCalledOnce()
        expect(authAppBusinessMock.mock.lastCall).toStrictEqual([key, undefined])

        const authenticatedButtonEmitted = wrapper.emitted('authenticated')
        expect(authenticatedButtonEmitted).toHaveLength(1)
        expect(authenticatedButtonEmitted![0]).toStrictEqual([
          {
            token: 'tokenTest',
            user: {
              type: accountType,
              id: 'id',
              name: 'name',
              login: 'login',
              avatarUrl: 'https://some-domain/avatar.png',
            },
          },
        ])
      }
    }
  })
  it('Authenticate force verify', async () => {
    const accounts: AccountDataStore = {
      twitch: {
        id: 'id',
        type: 'twitch',
        accountId: 'accountId',
        name: 'name',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar.png',
        token: 'token',
        invalid: true,
      },
      youtube: {
        id: 'id',
        type: 'youtube',
        accountId: 'accountId',
        name: 'name',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar2.png',
        token: 'token',
        invalid: true,
      },
    }

    for (const status of [false, true]) {
      const wrapper = mount(AuthActions, {
        props: {
          listItem: status,
        },
        global: {
          plugins: getTestPlugins({
            pinia: {
              initialState: {
                System: {
                  accounts: cloneDeep(accounts),
                },
              },
            },
          }),
        },
      })

      const system = mockedStore(useSystemStore)

      system.$patch({
        accounts: {
          twitch: {
            ...cloneDeep(accounts.twitch),
            invalid: status,
          },
        },
      })
      await nextTick()

      system.loading.mockClear()
      system.loaded.mockClear()
      authAppBusinessMock.mockClear()
      revokeAppBusinessMock.mockClear()

      authAppBusinessMock.mockImplementationOnce(() =>
        Promise.resolve({
          token: 'tokenTest2',
          user: {
            type: 'twitch',
            id: 'id2',
            name: 'name2',
            login: 'login2',
            avatarUrl: 'https://some-domain/avatar2.png',
          },
        })
      )
      authAppBusinessMock.mockImplementationOnce(() =>
        Promise.resolve({
          token: 'tokenTest',
          user: {
            type: 'twitch',
            id: 'accountId',
            name: 'name',
            login: 'login',
            avatarUrl: 'https://some-domain/avatar.png',
          },
        })
      )

      const element = wrapper.find(`${status ? 'div' : 'button'}[data-testid="twitch-auth"]`)
      expect(element.exists()).toBe(true)
      await element.trigger('click')

      expect(system.loading).toHaveBeenCalledTimes(2)
      expect(system.loaded).toHaveBeenCalledTimes(2)

      expect(authAppBusinessMock).toHaveBeenCalledTimes(2)
      expect(authAppBusinessMock.mock.calls).toStrictEqual([
        ['twitch', undefined],
        ['twitch', true],
      ])
      expect(revokeAppBusinessMock).toHaveBeenCalledOnce()
      expect(revokeAppBusinessMock.mock.lastCall).toStrictEqual(['twitch', 'tokenTest2'])

      const authenticatedButtonEmitted = wrapper.emitted('authenticated')
      expect(authenticatedButtonEmitted).toHaveLength(1)
      expect(authenticatedButtonEmitted![0]).toStrictEqual([
        {
          token: 'tokenTest',
          user: {
            type: 'twitch',
            id: 'accountId',
            name: 'name',
            login: 'login',
            avatarUrl: 'https://some-domain/avatar.png',
          },
        },
      ])
    }
  })
  it('Click with valid account', async () => {
    const accounts: AccountDataStore = {
      twitch: {
        id: 'id',
        type: 'twitch',
        accountId: 'accountId',
        name: 'twitchAccountName',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar.png',
        token: 'token',
        invalid: false,
      },
      youtube: {
        id: 'id',
        type: 'youtube',
        accountId: 'accountId',
        name: 'youtubeAccountName',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar2.png',
        token: 'token',
        invalid: false,
      },
    }

    const wrapper = mount(AuthActions, {
      props: {
        listItem: true,
      },
      global: {
        plugins: getTestPlugins({
          pinia: {
            initialState: {
              System: {
                accounts: cloneDeep(accounts),
              },
            },
          },
        }),
      },
    })

    const buttonAuthTypes: {
      [key in AccountStoreType]: {
        url: string
        dataTestid: string
      }
    } = {
      twitch: {
        url: 'https://twitch.tv/login',
        dataTestid: '[data-testid="twitch-auth"]',
      },
      youtube: {
        url: 'https://www.youtube.com/login',
        dataTestid: '[data-testid="youtube-auth"]',
      },
    }

    const createTabsSpy = vi.spyOn(browser.tabs, 'create')

    for (const { dataTestid, url } of Object.values(buttonAuthTypes)) {
      createTabsSpy.mockClear()

      const element = wrapper.find(dataTestid)
      expect(element.exists()).toBe(true)

      await element.trigger('click')

      expect(createTabsSpy).toHaveBeenCalledOnce()
      expect(createTabsSpy.mock.lastCall).toStrictEqual([{ url, active: true }])
    }
  })
  it('Click with invalid account', async () => {
    const accounts: AccountDataStore = {
      twitch: {
        id: 'id',
        type: 'twitch',
        accountId: 'accountId',
        name: 'twitchAccountName',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar.png',
        token: 'token',
        invalid: true,
      },
      youtube: {
        id: 'id',
        type: 'youtube',
        accountId: 'accountId',
        name: 'youtubeAccountName',
        login: 'login',
        avatarUrl: 'https://some-domain/avatar2.png',
        token: 'token',
        invalid: true,
      },
    }

    const buttonAuthTypes: {
      [key in AccountStoreType]: {
        dataTestid: string
      }
    } = {
      twitch: {
        dataTestid: '[data-testid="twitch-auth"]',
      },
      youtube: {
        dataTestid: '[data-testid="youtube-auth"]',
      },
    }

    for (const [key, { dataTestid }] of Object.entries(buttonAuthTypes)) {
      const accountType = key as AccountStoreType

      const wrapper = mount(AuthActions, {
        props: {
          listItem: true,
        },
        global: {
          plugins: getTestPlugins({
            pinia: {
              initialState: {
                System: {
                  accounts: cloneDeep(accounts),
                },
              },
            },
          }),
        },
      })

      const system = mockedStore(useSystemStore)

      system.loading.mockClear()
      system.loaded.mockClear()
      authAppBusinessMock.mockClear()

      authAppBusinessMock.mockImplementation(() =>
        Promise.resolve({
          token: 'tokenTest',
          user: {
            type: accountType,
            id: 'accountId',
            name: 'twitchAccountName',
            login: 'login',
            avatarUrl: 'https://some-domain/avatar.png',
          },
        })
      )

      const element = wrapper.find(`div${dataTestid}`)
      expect(element.exists()).toBe(true)
      await element.trigger('click')

      expect(system.loading).toHaveBeenCalledTimes(1)
      expect(system.loaded).toHaveBeenCalledTimes(1)

      expect(authAppBusinessMock).toHaveBeenCalledOnce()
      expect(authAppBusinessMock.mock.lastCall).toStrictEqual([accountType, undefined])

      const authenticatedButtonEmitted = wrapper.emitted('authenticated')
      expect(authenticatedButtonEmitted).toHaveLength(1)
      expect(authenticatedButtonEmitted![0]).toStrictEqual([
        {
          token: 'tokenTest',
          user: {
            type: accountType,
            id: 'accountId',
            name: 'twitchAccountName',
            login: 'login',
            avatarUrl: 'https://some-domain/avatar.png',
          },
        },
      ])
    }
  })
})
