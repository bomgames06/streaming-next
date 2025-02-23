import { describe, expect, it } from 'vitest'
import { getTestPlugins, localesEnvironment, mockedStore } from '@tests/__utils__/util.ts'
import type { DOMWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import AuthActions from '@/components/auth/AuthActions.vue'
import type { AccountDataStore, AccountStoreType } from '@/store/system/types/systemStoreType.ts'
import AuthActionsButton from '@/components/auth/AuthActionsButton.vue'
import useSystemStore from '@/store/system/useSystemStore.ts'
import { cloneDeep } from 'lodash'

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
          },
          'pt-BR': {
            twitchButtonText: 'Autenticar na Twitch',
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
          },
          'pt-BR': {
            twitchButtonText: 'Autenticar na Twitch',
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
      }

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
          expect(element.find(`i.${iconClass}.mdi.v-icon`).exists()).toBe(false)
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
})
