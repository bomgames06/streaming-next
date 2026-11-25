import i18n, { type Locales, locales } from '@/plugins/i18n'
import type { Component, Plugin, UnwrapRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import useSystemStore from '@/store/system/useSystemStore'
import apiPlugin from '@/plugins/api'
import momentPlugin from '@/plugins/moment'
import toastrPlugin from '@/plugins/toastr'
import vuetify from '@/plugins/vuetify'
import errorPlugin from '@/plugins/error'
import { createTestingPinia, type TestingOptions } from '@pinia/testing'
import { createPinia, setActivePinia, type Store, type StoreDefinition } from 'pinia'
import { cloneDeep } from 'lodash'
import type { Mock } from '@vitest/spy'
import { vi } from 'vitest'

export function getTestPlugins(config?: { pinia?: TestingOptions }): Plugin[] {
  return [
    apiPlugin,
    i18n,
    momentPlugin,
    toastrPlugin,
    createTestingPinia({
      createSpy: vi.fn,
      ...(config?.pinia || {}),
    }),
    vuetify,
    errorPlugin,
  ]
}

export function mockedStore<TStoreDef extends () => unknown>(
  useStore: TStoreDef
): TStoreDef extends StoreDefinition<infer Id, infer State, infer Getters, infer Actions>
  ? Store<
      Id,
      State,
      Record<string, never>,
      {
        [K in keyof Actions]: Actions[K] extends (...args: any[]) => any ? Mock<Actions[K]> : Actions[K]
      }
    > & {
      [K in keyof Getters]: UnwrapRef<Getters[K]>
    }
  : ReturnType<TStoreDef> {
  return useStore() as any
}

/**
 * Mount with the real plugins and a real store (actions and writable computed values behave like the app),
 * starting from the given store state.
 * Overlays (v-menu, v-dialog) are teleported to the body, so the component is attached to it.
 */
export function mountWithStore<T extends Component>(
  component: T,
  options?: {
    props?: Record<string, unknown>
    state?: Record<string, unknown>
    slots?: Record<string, unknown>
    attach?: boolean
  }
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const system = useSystemStore(pinia)
  if (options?.state) system.$patch(cloneDeep(options.state))

  const wrapper = mount(component as any, {
    attachTo: options?.attach === false ? undefined : document.body,
    props: options?.props,
    slots: options?.slots as any,
    global: {
      plugins: [apiPlugin, i18n, momentPlugin, toastrPlugin, pinia, vuetify, errorPlugin],
    },
  })
  return { wrapper, system }
}

/** Flush promises and wait the overlay delays and frames Vuetify uses to (re)activate menus and dialogs */
export async function settle(ms = 30): Promise<void> {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, ms))
  await flushPromises()
}

/** Overlay content lives on the body, outside the wrapper */
export function bodyFind<T extends Element = HTMLElement>(selector: string): T | null {
  return document.body.querySelector<T>(selector)
}
export function bodyFindAll<T extends Element = HTMLElement>(selector: string): T[] {
  return Array.from(document.body.querySelectorAll<T>(selector))
}
export function bodyFindByText<T extends Element = HTMLElement>(selector: string, text: string): T | undefined {
  return bodyFindAll<T>(selector).find((element) => element.textContent?.trim() === text)
}

type DictionaryLocalesEnvironment<Keys extends string> = { [key in Keys]: string }
type LocaleDictionaryLocalesEnvironment<Keys extends string> = { [key in Locales]: DictionaryLocalesEnvironment<Keys> }
export async function localesEnvironment<Keys extends string>(
  fn: (dictionary: DictionaryLocalesEnvironment<Keys>, locale: Locales) => void | Promise<void>,
  dictionary: LocaleDictionaryLocalesEnvironment<Keys>
): Promise<void> {
  const originalLocale = i18n.global.locale.value

  for (const locale of locales) {
    Object.defineProperty(navigator, 'language', {
      value: locale,
      configurable: true,
    })
    i18n.global.locale.value = locale

    await fn(dictionary[locale], locale)
  }

  i18n.global.locale.value = originalLocale
}
