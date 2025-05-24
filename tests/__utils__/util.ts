import i18n, { type Locales, locales } from '@/plugins/i18n'
import type { Plugin, UnwrapRef } from 'vue'
import apiPlugin from '@/plugins/api'
import momentPlugin from '@/plugins/moment'
import toastrPlugin from '@/plugins/toastr'
import vuetify from '@/plugins/vuetify'
import errorPlugin from '@/plugins/error'
import { createTestingPinia, type TestingOptions } from '@pinia/testing'
import type { Store, StoreDefinition } from 'pinia'
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
    vuetify(),
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
