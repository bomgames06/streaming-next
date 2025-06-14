import { defineStore } from 'pinia'
import browser from 'webextension-polyfill'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_DARK,
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_GROUP_EXPANDED,
  STORAGE_KEY_GROUP_STREAMS,
  STORAGE_KEY_LANGUAGE,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
  STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
  STORAGE_KEY_SHOW_FAVORITES,
  STORAGE_KEY_SHOW_GROUPS,
  STORAGE_KEY_SHOW_NO_GROUP,
  STORAGE_KEY_SHOW_NOTIFICATIONS,
  STORAGE_KEY_STREAM_ORDER,
  STORAGE_KEY_STREAM_ORDER_SORT,
  type StorageSyncTypes,
} from '@/types/syncStorageKeysTypes'
import { STORAGE_KEY_ACCOUNTS_CACHE_STREAMS } from '@/types/localStorageKeysTypes'
import type { ThemeInstance } from 'vuetify'
import type { Locales } from '@/plugins/i18n'
import { locale } from '@/plugins/i18n'
import type { Composer } from 'vue-i18n'
import { v4 as uuidV4 } from 'uuid'
import AppBusiness from '@/services/business/appBusiness'
import { cloneDeep, compact, upperCase } from 'lodash'
import type {
  AccountCacheStreamsDataStore,
  AccountDataStore,
  AccountStore,
  AccountStoreType,
  CategoryNotificationStore,
  ClipPeriodStore,
  FavoriteStore,
  GroupStreamStore,
  HeaderAppBarViewStore,
  LanguageCategoryStreamStore,
  NotificationStore,
  NotificationTypeStore,
  ScreenStore,
  StreamOrderSortStore,
  StreamOrderStore,
  VideoOrderStore,
  ViewDataStore,
  ViewStore,
} from '@/store/system/types/systemStoreType'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'

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
  const favorites = ref<FavoriteStore[]>([])
  const categoryNotifications = ref<CategoryNotificationStore[]>([])
  const dark = ref<boolean>(false)
  const language = ref<Locales>(locale)
  const showAlwaysOfflines = ref<boolean>(false)
  const showNoGroup = ref<boolean>(false)
  const accountsCacheStreams = ref<AccountCacheStreamsDataStore>({})
  const groupStreams = ref<GroupStreamStore[]>([])

  // View
  const streamFilter = ref<string>('')
  const streamOrder = ref<StreamOrderStore>('name')
  const streamOrderSort = ref<StreamOrderSortStore>(true)
  const streamNameFilter = ref<string>('')
  const categoryNameFilter = ref<string>('')
  const showGroups = ref<boolean>(false)
  const showFavorites = ref<boolean>(false)
  const showNotifications = ref<boolean>(false)
  const groupExpanded = ref<string[]>([])

  // Video view
  const videoOrder = ref<VideoOrderStore>('time')
  // Clip view
  const clipPeriod = ref<ClipPeriodStore>('7d')
  // Category stream view
  const languageCategoryStream = ref<LanguageCategoryStreamStore[]>([])

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
  const categoryNameFilterComp = computed({ get: () => categoryNameFilter.value, set: setCategoryNameFilter })
  const showGroupsComp = computed({ get: () => showGroups.value, set: setShowGroups })
  const showFavoritesComp = computed({ get: () => showFavorites.value, set: setShowFavorites })
  const showNotificationsComp = computed({ get: () => showNotifications.value, set: setShowNotifications })
  const groupExpandedComp = computed({ get: () => groupExpanded.value, set: setGroupExpanded })

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
    const syncStorage: StorageSyncTypes = (await browser.storage.sync.get([
      STORAGE_KEY_ACCOUNTS,
      STORAGE_KEY_NOTIFICATIONS,
      STORAGE_KEY_NOTIFICATION_TYPE,
      STORAGE_KEY_FAVORITES,
      STORAGE_KEY_DARK,
      STORAGE_KEY_LANGUAGE,
      STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
      STORAGE_KEY_SHOW_NO_GROUP,
      STORAGE_KEY_STREAM_ORDER,
      STORAGE_KEY_STREAM_ORDER_SORT,
      STORAGE_KEY_SHOW_GROUPS,
      STORAGE_KEY_SHOW_FAVORITES,
      STORAGE_KEY_SHOW_NOTIFICATIONS,
      STORAGE_KEY_CATEGORY_NOTIFICATIONS,
      STORAGE_KEY_GROUP_STREAMS,
      STORAGE_KEY_GROUP_EXPANDED,
    ])) as StorageSyncTypes
    const localStorage = await browser.storage.local.get([STORAGE_KEY_ACCOUNTS_CACHE_STREAMS])

    accounts.value = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
    notifications.value = syncStorage[STORAGE_KEY_NOTIFICATIONS] ?? []
    notificationType.value = syncStorage[STORAGE_KEY_NOTIFICATION_TYPE] ?? 'none'
    favorites.value = syncStorage[STORAGE_KEY_FAVORITES] ?? []
    dark.value = syncStorage[STORAGE_KEY_DARK] ?? false
    language.value = syncStorage[STORAGE_KEY_LANGUAGE] ?? locale
    showAlwaysOfflines.value = syncStorage[STORAGE_KEY_SHOW_ALWAYS_OFFLINES] ?? false
    showNoGroup.value = syncStorage[STORAGE_KEY_SHOW_NO_GROUP] ?? false
    streamOrder.value = syncStorage[STORAGE_KEY_STREAM_ORDER] ?? 'name'
    streamOrderSort.value = syncStorage[STORAGE_KEY_STREAM_ORDER_SORT] ?? true
    showGroups.value = syncStorage[STORAGE_KEY_SHOW_GROUPS] ?? false
    showFavorites.value = syncStorage[STORAGE_KEY_SHOW_FAVORITES] ?? false
    showNotifications.value = syncStorage[STORAGE_KEY_SHOW_NOTIFICATIONS] ?? false
    accountsCacheStreams.value = localStorage[STORAGE_KEY_ACCOUNTS_CACHE_STREAMS] ?? {}
    categoryNotifications.value = syncStorage[STORAGE_KEY_CATEGORY_NOTIFICATIONS] ?? []
    groupStreams.value = syncStorage[STORAGE_KEY_GROUP_STREAMS] ?? []
    groupExpanded.value = syncStorage[STORAGE_KEY_GROUP_EXPANDED] ?? []

    setDark(dark.value, theme)
    setLanguage(language.value, i18n)
  }

  // utils
  function saveAccounts() {
    void browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: cloneDeep(accounts.value) })
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
      } catch {
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
    setAccountCacheStreams(account.type, [])
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
  function addNotification(accountType: AccountStoreType, id: string) {
    notifications.value.push({ type: accountType, id })
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATIONS]: cloneDeep(notifications.value) })
  }
  function removeNotification(accountType: AccountStoreType, id: string) {
    notifications.value = notifications.value.filter((value) => !(value.type === accountType && value.id === id))
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATIONS]: cloneDeep(notifications.value) })
  }
  function addFavorite(accountType: AccountStoreType, id: string) {
    favorites.value.push({ type: accountType, id })
    void browser.storage.sync.set({ [STORAGE_KEY_FAVORITES]: cloneDeep(favorites.value) })
  }
  function removeFavorite(accountType: AccountStoreType, id: string) {
    favorites.value = favorites.value.filter((value) => !(value.type === accountType && value.id === id))
    void browser.storage.sync.set({ [STORAGE_KEY_FAVORITES]: cloneDeep(favorites.value) })
  }
  function addCategoryNotification(name: string, imageUrl?: string) {
    let item: CategoryNotificationStore | undefined = categoryNotifications.value.find(
      (value) => upperCase(value.name) === upperCase(name)
    )
    if (!item) {
      item = {
        id: crypto.randomUUID(),
        name: '',
        streams: [],
      }
      categoryNotifications.value.push(item)
    }
    item.name = name
    item.imageUrl = imageUrl

    void browser.storage.sync.set({ [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: cloneDeep(categoryNotifications.value) })

    return item.id
  }
  function removeCategoryNotification(id: string) {
    categoryNotifications.value = categoryNotifications.value.filter((value) => value.id !== id)

    void browser.storage.sync.set({ [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: cloneDeep(categoryNotifications.value) })
  }
  function addStreamCategoryNotification(id: string, type: AccountStoreType, streamId: string) {
    const item = categoryNotifications.value.find((item) => item.id === id)
    if (!item || item.streams.find((item) => item.type === type && item.id === streamId)) return

    item.streams.push({ type, id: streamId })

    void browser.storage.sync.set({ [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: cloneDeep(categoryNotifications.value) })
  }
  function removeStreamCategoryNotification(id: string, type: AccountStoreType, streamId: string) {
    const item = categoryNotifications.value.find((item) => item.id === id)
    if (!item) return

    item.streams = item.streams.filter((item) => item.type !== type || item.id !== streamId)

    void browser.storage.sync.set({ [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: cloneDeep(categoryNotifications.value) })
  }
  function cleanNotification() {
    notifications.value = []
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATIONS]: cloneDeep(notifications.value) })
  }
  function cleanCategoryNotification() {
    categoryNotifications.value = []
    void browser.storage.sync.set({ [STORAGE_KEY_CATEGORY_NOTIFICATIONS]: cloneDeep(categoryNotifications.value) })
  }
  function cleanFavorite() {
    favorites.value = []
    void browser.storage.sync.set({ [STORAGE_KEY_FAVORITES]: cloneDeep(favorites.value) })
  }
  function setNotificationType(type: NotificationTypeStore) {
    notificationType.value = type
    void browser.storage.sync.set({ [STORAGE_KEY_NOTIFICATION_TYPE]: cloneDeep(notificationType.value) })
  }
  function setDark(value: boolean, theme: ThemeInstance) {
    dark.value = value
    theme.global.name.value = dark.value ? 'dark' : 'light'
    void browser.storage.sync.set({ [STORAGE_KEY_DARK]: cloneDeep(dark.value) })
  }
  function setLanguage(value: Locales, i18n: Composer) {
    language.value = value
    i18n.locale.value = language.value
    document.documentElement.setAttribute('lang', language.value)
    void browser.storage.sync.set({ [STORAGE_KEY_LANGUAGE]: cloneDeep(language.value) })
  }
  function setShowAlwaysOfflines(value: boolean) {
    showAlwaysOfflines.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_SHOW_ALWAYS_OFFLINES]: cloneDeep(showAlwaysOfflines.value) })
  }
  function setShowNoGroup(value: boolean) {
    showNoGroup.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_SHOW_NO_GROUP]: cloneDeep(showNoGroup.value) })
  }
  function setAccountCacheStreams(accountType: AccountStoreType, value: StreamItemLiveStreamType[]) {
    accountsCacheStreams.value[accountType] = value
    void browser.storage.local.set({ [STORAGE_KEY_ACCOUNTS_CACHE_STREAMS]: cloneDeep(accountsCacheStreams.value) })
  }
  function addGroupStream(name: string): string {
    const id = crypto.randomUUID()
    groupStreams.value.push({
      id,
      name,
      streams: [],
    })

    void browser.storage.sync.set({ [STORAGE_KEY_GROUP_STREAMS]: cloneDeep(groupStreams.value) })

    return id
  }
  function removeGroupStream(id: string): void {
    groupStreams.value = groupStreams.value.filter((value) => value.id !== id)

    void browser.storage.sync.set({ [STORAGE_KEY_GROUP_STREAMS]: cloneDeep(groupStreams.value) })
  }
  function editGroupStream(id: string, patch: Partial<Omit<GroupStreamStore, 'id' | 'streams'>>): void {
    const group = groupStreams.value.find((value) => value.id === id)
    if (!group) return

    Object.assign(group, patch)

    void browser.storage.sync.set({ [STORAGE_KEY_GROUP_STREAMS]: cloneDeep(groupStreams.value) })
  }
  function addStreamToGroupStream(id: string, streamTypeId: AccountStoreType, streamId: string): void {
    const group = groupStreams.value.find((value) => value.id === id)
    if (!group) return

    group.streams.push({ id: streamId, type: streamTypeId })

    void browser.storage.sync.set({ [STORAGE_KEY_GROUP_STREAMS]: cloneDeep(groupStreams.value) })
  }
  function removeStreamFromGroupStream(id: string, streamTypeId: AccountStoreType, streamId: string): void {
    const group = groupStreams.value.find((value) => value.id === id)
    if (!group) return

    group.streams = group.streams.filter((value) => !(value.id === streamId && value.type === streamTypeId))

    void browser.storage.sync.set({ [STORAGE_KEY_GROUP_STREAMS]: cloneDeep(groupStreams.value) })
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
    void browser.storage.sync.set({ [STORAGE_KEY_STREAM_ORDER]: cloneDeep(streamOrder.value) })
    void browser.storage.sync.set({ [STORAGE_KEY_STREAM_ORDER_SORT]: cloneDeep(streamOrderSort.value) })
  }
  function setStreamNameFilter(value: string) {
    streamNameFilter.value = value
  }
  function setCategoryNameFilter(value: string) {
    categoryNameFilter.value = value
  }
  function setShowGroups(value: boolean) {
    showGroups.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_SHOW_GROUPS]: cloneDeep(showGroups.value) })
  }
  function setShowFavorites(value: boolean) {
    showFavorites.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_SHOW_FAVORITES]: cloneDeep(showFavorites.value) })
  }
  function setShowNotifications(value: boolean) {
    showNotifications.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_SHOW_NOTIFICATIONS]: cloneDeep(showNotifications.value) })
  }
  function setGroupExpanded(value: string[]) {
    groupExpanded.value = value
    void browser.storage.sync.set({ [STORAGE_KEY_GROUP_EXPANDED]: cloneDeep(groupExpanded.value) })
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
  function setLanguageCategoryStream(value: LanguageCategoryStreamStore[]) {
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
    favorites,
    categoryNotifications,
    dark,
    language,
    showAlwaysOfflines,
    showNoGroup,
    accountsCacheStreams,
    groupStreams,
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
    categoryNameFilterComp,
    showGroupsComp,
    showFavoritesComp,
    showNotificationsComp,
    groupExpandedComp,
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
    addNotification,
    removeNotification,
    addFavorite,
    removeFavorite,
    addCategoryNotification,
    removeCategoryNotification,
    addStreamCategoryNotification,
    removeStreamCategoryNotification,
    cleanNotification,
    cleanCategoryNotification,
    cleanFavorite,
    setNotificationType,
    setDark,
    setLanguage,
    setShowAlwaysOfflines,
    setShowNoGroup,
    setAccountCacheStreams,
    addGroupStream,
    removeGroupStream,
    editGroupStream,
    addStreamToGroupStream,
    removeStreamFromGroupStream,
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
