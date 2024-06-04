import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import browser from 'webextension-polyfill'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_DARK,
  STORAGE_KEY_LANGUAGE,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
  STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
  STORAGE_KEY_STREAM_ORDER,
  STORAGE_KEY_STREAM_ORDER_SORT,
} from '@/types/syncStorageKeysTypes'
import type { ThemeInstance } from 'vuetify'
import type { Locales } from '@/plugins/i18n'
import { locale } from '@/plugins/i18n'
import type { Composer } from 'vue-i18n'
import { v4 as uuidV4 } from 'uuid'
import AppBusiness from '@/services/business/appBusiness'
import { compact } from 'lodash'
import type {
  AccountStore,
  AccountDataStore,
  AccountStoreType,
  ClipPeriodStore,
  HeaderAppBarViewStore,
  LanguageCategoryStreamStore,
  NotificationTypeStore,
  NotificationStore,
  ScreenStore,
  StreamOrderStore,
  StreamOrderSortStore,
  VideoOrderStore,
  ViewStore,
  ViewDataStore,
} from '@/store/system/types/systemStoreType'

const useSystemStore = defineStore('System', () => {
  // System
  const appBarHeight = ref<number>(36)
  const screen = ref<ScreenStore>('loading')
  const view = ref<ViewStore>('streams')
  const viewData = ref<ViewDataStore>()
  const loadingCount = ref<number>(0)
  const refreshingCount = ref<number>(0)
  const timer = ref<number>(Date.now())
  const headerAppBarView = ref<HeaderAppBarViewStore>()

  // Storage
  const accounts = ref<AccountDataStore>({})
  const notifications = ref<NotificationStore[]>([])
  const notificationType = ref<NotificationTypeStore>('none')
  const dark = ref<boolean>(false)
  const language = ref<Locales>(locale)
  const showAlwaysOfflines = ref<boolean>(false)

  // View
  const streamFilter = ref<string>('')
  const streamOrder = ref<StreamOrderStore>('name')
  const streamOrderSort = ref<StreamOrderSortStore>(true)
  const streamNameFilter = ref<string>('')

  // Video view
  const videoOrder = ref<VideoOrderStore>('time')
  // Clip view
  const clipPeriod = ref<ClipPeriodStore>('24h')
  // Category stream view
  const languageCategoryStream = ref<LanguageCategoryStreamStore>()

  // Computed
  const isEveryAccountInvalid = computed(() => {
    const accountValues = compact(Object.values(accounts.value))
    return !!accountValues.length && accountValues.every((value) => value.invalid)
  })
  const hasInvalidAccount = computed(() => {
    const accountValues = compact(Object.values(accounts.value))
    return accountValues.some((value) => value.invalid)
  })
  const hasAccount = computed(() => {
    return compact(Object.values(accounts.value)).length
  })
  const mainAccount = computed(() => {
    return accounts.value.twitch
  })
  const validAccounts = computed(() => {
    return compact(Object.values(accounts.value)).filter((value) => !value.invalid)
  })
  const isLoading = computed(() => !!loadingCount.value)
  const isRefreshing = computed(() => !!refreshingCount.value)

  // Computed value
  const streamFilterComp = computed({ get: () => streamFilter.value, set: setStreamFilter })
  const streamNameFilterComp = computed({ get: () => streamNameFilter.value, set: setStreamNameFilter })

  // System actions
  function setScreen(value: ScreenStore) {
    screen.value = value
    if (screen.value === 'home') setView('streams')
  }
  function setView(value: ViewStore, data?: ViewDataStore) {
    viewData.value = data
    view.value = value
    headerAppBarView.value = undefined
  }
  function loading() {
    loadingCount.value += 1
  }
  function loaded() {
    if (loadingCount.value > 0) loadingCount.value -= 1
  }
  function refreshing() {
    refreshingCount.value += 1
  }
  function refreshed() {
    if (refreshingCount.value > 0) refreshingCount.value -= 1
  }
  function updateTimer() {
    timer.value = Date.now()
  }
  function setHeaderAppBarView(value?: HeaderAppBarViewStore) {
    headerAppBarView.value = value
  }

  // Load init values
  async function init(theme: ThemeInstance, i18n: Composer) {
    const syncStorage = await browser.storage.sync.get([
      STORAGE_KEY_ACCOUNTS,
      STORAGE_KEY_NOTIFICATIONS,
      STORAGE_KEY_NOTIFICATION_TYPE,
      STORAGE_KEY_DARK,
      STORAGE_KEY_LANGUAGE,
      STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
      STORAGE_KEY_STREAM_ORDER,
      STORAGE_KEY_STREAM_ORDER_SORT,
    ])

    accounts.value = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
    notifications.value = syncStorage[STORAGE_KEY_NOTIFICATIONS] ?? []
    notificationType.value = syncStorage[STORAGE_KEY_NOTIFICATION_TYPE] ?? 'none'
    dark.value = syncStorage[STORAGE_KEY_DARK] ?? false
    language.value = syncStorage[STORAGE_KEY_LANGUAGE] ?? locale
    showAlwaysOfflines.value = syncStorage[STORAGE_KEY_SHOW_ALWAYS_OFFLINES] ?? false
    streamOrder.value = syncStorage[STORAGE_KEY_STREAM_ORDER] ?? 'name'
    streamOrderSort.value = syncStorage[STORAGE_KEY_STREAM_ORDER_SORT] ?? true

    setDark(dark.value, theme)
    setLanguage(language.value, i18n)
  }

  // utils
  function saveAccounts() {
    void browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: accounts.value })
  }
  function getAccountByType(type: AccountStoreType) {
    const value = accounts.value[type]
    if (!value) throw new Error('Account not found')

    return value
  }

  // Storage actions
  async function fetchAccounts() {
    for (const account of compact(Object.values(accounts.value))) {
      try {
        const user = await AppBusiness.getSelfUser(account.token, account.type)
        account.name = user.name
        account.avatarUrl = user.avatarUrl
        account.accountId = user.id
        account.invalid = false
      } catch (e) {
        account.invalid = true
      }
    }
    saveAccounts()
  }
  function addAccount(account: Omit<AccountStore, 'id' | 'invalid'>) {
    const accountItem = accounts.value[account.type]
    if (accountItem) {
      accountItem.invalid = false
      accountItem.name = account.name
      accountItem.avatarUrl = account.avatarUrl
      accountItem.token = account.token
    } else {
      const id = uuidV4()
      accounts.value[account.type] = {
        id,
        invalid: false,
        ...account,
      }
    }
    saveAccounts()
  }
  function removeAccount(accountType: AccountStoreType) {
    const account = accounts.value[accountType]
    if (account) {
      delete accounts.value[accountType]
      void AppBusiness.revoke(account.type, account.token)
    }

    if (!hasAccount.value || isEveryAccountInvalid.value) setScreen('auth')
    saveAccounts()
  }
  function invalidAccountByToken(token: string) {
    const value = Object.values(accounts.value).find((value) => value.token === token)
    if (!value) return
    value.invalid = true
    saveAccounts()
  }
  function updateTokenAccountByToken(token: string, newToken: string) {
    const value = Object.values(accounts.value).find((value) => value.token === token)
    if (!value) return
    value.token = newToken
    saveAccounts()
  }
  function addNotification(accountType: AccountStoreType, id: string) {
    notifications.value.push({ type: accountType, id })
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATIONS]: [...notifications.value] })
  }
  function removeNotification(accountType: AccountStoreType, id: string) {
    notifications.value = notifications.value.filter((value) => !(value.type === accountType && value.id === id))
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATIONS]: [...notifications.value] })
  }
  function cleanNotification() {
    notifications.value = []
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATIONS]: [...notifications.value] })
  }
  function setNotificationType(type: NotificationTypeStore) {
    notificationType.value = type
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATION_TYPE]: notificationType.value })
  }
  function setDark(value: boolean, theme: ThemeInstance) {
    dark.value = value
    theme.global.name.value = dark.value ? 'dark' : 'light'
    void browser.storage.sync.set({ [STORAGE_KEY_DARK]: dark.value })
  }
  function setLanguage(value: Locales, i18n: Composer) {
    language.value = value
    i18n.locale.value = language.value
    document.documentElement.setAttribute('lang', language.value)
    void browser.storage.sync.set({ [STORAGE_KEY_LANGUAGE]: language.value })
  }
  function setShowAlwaysOfflines(value: boolean) {
    showAlwaysOfflines.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_SHOW_ALWAYS_OFFLINES]: showAlwaysOfflines.value })
  }

  // View actions
  function setStreamFilter(value: string) {
    streamFilter.value = value
  }
  function setStreamOrder(value: StreamOrderStore) {
    if (streamOrder.value === value) {
      streamOrderSort.value = !streamOrderSort.value
    } else {
      streamOrder.value = value
      if (!streamOrderSort.value) streamOrderSort.value = true
    }
    void browser.storage.sync.set({ [STORAGE_KEY_STREAM_ORDER]: streamOrder.value })
    void browser.storage.sync.set({ [STORAGE_KEY_STREAM_ORDER_SORT]: streamOrderSort.value })
  }
  function setStreamNameFilter(value: string) {
    streamNameFilter.value = value
  }

  // Video view actions
  function setVideoOrder(value: VideoOrderStore) {
    videoOrder.value = value
  }
  // Clip view actions
  function setClipPeriod(value: ClipPeriodStore) {
    clipPeriod.value = value
  }
  // Category stream view actions
  function setLanguageCategoryStream(value?: LanguageCategoryStreamStore) {
    languageCategoryStream.value = value
  }

  return {
    init,
    // system
    appBarHeight,
    screen,
    view,
    viewData,
    loadingCount,
    refreshingCount,
    timer,
    headerAppBarView,
    // storage
    accounts,
    notifications,
    notificationType,
    dark,
    language,
    showAlwaysOfflines,
    // view
    streamFilter,
    streamOrder,
    streamOrderSort,
    streamNameFilter,
    // video view
    videoOrder,
    // clip view
    clipPeriod,
    // category stream view
    languageCategoryStream,
    // computed
    isEveryAccountInvalid,
    hasInvalidAccount,
    hasAccount,
    mainAccount,
    validAccounts,
    isLoading,
    isRefreshing,
    // computed value
    streamFilterComp,
    streamNameFilterComp,
    // utils
    getAccountByType,
    // actions system
    setScreen,
    setView,
    loading,
    loaded,
    refreshing,
    refreshed,
    updateTimer,
    setHeaderAppBarView,
    // actions storage
    fetchAccounts,
    addAccount,
    removeAccount,
    invalidAccountByToken,
    updateTokenAccountByToken,
    addNotification,
    removeNotification,
    cleanNotification,
    setNotificationType,
    setDark,
    setLanguage,
    setShowAlwaysOfflines,
    // view action
    setStreamOrder,
    // video view action,
    setVideoOrder,
    // clip view action,
    setClipPeriod,
    // category stream view action,
    setLanguageCategoryStream,
  }
})

export default useSystemStore
