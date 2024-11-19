import useSystemStore from '@/store/system/useSystemStore'
import { useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'
import type { ApplicationMessageType, FetchStreamBackgroundMessageType } from '@/background/types/backgroundMessageType'
import browser from 'webextension-polyfill'

export default function useAppInit(noAuth?: boolean) {
  const system = useSystemStore()
  const theme = useTheme()
  const i18n = useI18n()

  const loaded = ref<boolean>(false)
  const error = ref<boolean>(false)

  const timerInterval = setInterval(system.updateTimer, 1000)
  onUnmounted(() => {
    browser.runtime.onMessage.removeListener(appMessage)
    clearInterval(timerInterval)
  })

  system.init(theme, i18n).then(init)
  async function init(): Promise<void> {
    try {
      await system.fetchAccounts()

      loaded.value = true
      await nextTick()

      if (!noAuth && (!system.hasAccount || system.isEveryAccountInvalid)) return void system.setScreen('auth')
      system.setScreen('home')
    } catch {
      error.value = true
    }
  }

  browser.runtime.onMessage.addListener(appMessage)
  function appMessage(messageValue: unknown) {
    const message = messageValue as ApplicationMessageType
    switch (message.type) {
      case 'fetchAccounts':
        return fetchAccounts()
      default:
        break
    }
  }

  async function fetchAccounts() {
    await system.fetchAccounts()
  }

  watch([() => system.hasAccount, () => system.hasInvalidAccount], () => {
    const message: FetchStreamBackgroundMessageType = { type: 'fetchStream' }
    void browser.runtime.sendMessage(message)
  })

  return { loaded, error }
}
