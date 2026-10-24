import { defineStore } from 'pinia'
import { browser } from 'wxt/browser'
import {
  STORAGE_KEY_ACCOUNTS,
  STORAGE_KEY_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_DARK,
  STORAGE_KEY_CATEGORY_FAVORITES,
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_GROUP_EXPANDED,
  STORAGE_KEY_GROUP_STREAMS,
  STORAGE_KEY_LANGUAGE,
  STORAGE_KEY_NOTIFICATION_TYPE,
  STORAGE_KEY_NOTIFICATIONS,
  STORAGE_KEY_SHOW_ALWAYS_OFFLINES,
  STORAGE_KEY_SHOW_FAVORITES,
  STORAGE_KEY_SHOW_CATEGORY_FAVORITES,
  STORAGE_KEY_SHOW_GROUPS,
  STORAGE_KEY_SHOW_NO_GROUP,
  STORAGE_KEY_SHOW_NOTIFICATIONS,
  STORAGE_KEY_STREAM_ORDER,
  STORAGE_KEY_STREAM_ORDER_SORT,
  type StorageSyncTypes,
  STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS,
  STORAGE_KEY_SHOW_UPCOMINGS,
  STORAGE_KEY_HIDDEN_STREAM_TYPES,
} from '@/types/syncStorageKeysTypes'
import { STORAGE_KEY_ACCOUNTS_CACHE_STREAMS } from '@/types/localStorageKeysTypes'
import type { ThemeInstance } from 'vuetify'
import type { Locales } from '@/plugins/i18n'
import { locale, resolveLocale } from '@/plugins/i18n'
import type { Composer } from 'vue-i18n'
import { v4 as uuidV4 } from 'uuid'
import AppBusiness from '@/services/business/appBusiness'
import { cloneDeep, compact } from 'lodash'
import { HttpStatusCode, isAxiosError } from 'axios'
import type { AuthenticatedType } from '@/types/userType'
import { isSameCategoryName } from '@/utils/util'
import type {
  AccountCacheStreamsDataStore,
  AccountDataStore,
  AccountStore,
  AccountStoreType,
  CategoryNotificationStore,
  ClipPeriodStore,
  FavoriteGroup,
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
import { DEFAULT_NOTIFICATION_TYPE } from '@/store/system/types/systemStoreType'
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
  const notificationType = ref<NotificationTypeStore>(DEFAULT_NOTIFICATION_TYPE)
  const favorites = ref<FavoriteStore[]>([])
  const categoryNotifications = ref<CategoryNotificationStore[]>([])
  const dark = ref<boolean>(false)
  const language = ref<Locales>(locale)
  const showAlwaysOfflines = ref<boolean>(false)
  const showNoGroup = ref<boolean>(false)
  const accountsCacheStreams = ref<AccountCacheStreamsDataStore>({})
  const groupStreams = ref<GroupStreamStore[]>([])
  const categoryFavorites = ref<FavoriteGroup[]>([])

  // View
  const streamFilter = ref<string>('')
  const streamOrder = ref<StreamOrderStore>('name')
  const streamOrderSort = ref<StreamOrderSortStore>(true)
  const streamNameFilter = ref<string>('')
  const categoryNameFilter = ref<string>('')
  const showGroups = ref<boolean>(false)
  const showFavorites = ref<boolean>(false)
  const showCategoryFavorites = ref<boolean>(false)
  const showCategoryNotifications = ref<boolean>(false)
  const showNotifications = ref<boolean>(false)
  const groupExpanded = ref<string[]>([])
  const showUpcomings = ref<boolean>(true)
  const hiddenStreamTypes = ref<AccountStoreType[]>([])

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
    return accounts.value.twitch ?? accounts.value.youtube
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
  const showCategoryFavoritesComp = computed({
    get: () => showCategoryFavorites.value,
    set: setShowcategoryFavorites,
  })
  const showCategoryNotificationsComp = computed({
    get: () => showCategoryNotifications.value,
    set: setShowCategoryNotifications,
  })
  const showNotificationsComp = computed({ get: () => showNotifications.value, set: setShowNotifications })
  const groupExpandedComp = computed({ get: () => groupExpanded.value, set: setGroupExpanded })
  const showUpcomingsComp = computed({ get: () => showUpcomings.value, set: setShowUpcomings })

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
      STORAGE_KEY_SHOW_CATEGORY_FAVORITES,
      STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS,
      STORAGE_KEY_SHOW_NOTIFICATIONS,
      STORAGE_KEY_CATEGORY_NOTIFICATIONS,
      STORAGE_KEY_GROUP_STREAMS,
      STORAGE_KEY_GROUP_EXPANDED,
      STORAGE_KEY_CATEGORY_FAVORITES,
      STORAGE_KEY_SHOW_UPCOMINGS,
      STORAGE_KEY_HIDDEN_STREAM_TYPES,
    ])) as StorageSyncTypes
    const localStorage = await browser.storage.local.get([STORAGE_KEY_ACCOUNTS_CACHE_STREAMS])

    accounts.value = syncStorage[STORAGE_KEY_ACCOUNTS] ?? {}
    notifications.value = syncStorage[STORAGE_KEY_NOTIFICATIONS] ?? []
    notificationType.value = syncStorage[STORAGE_KEY_NOTIFICATION_TYPE] ?? DEFAULT_NOTIFICATION_TYPE
    favorites.value = syncStorage[STORAGE_KEY_FAVORITES] ?? []
    dark.value = syncStorage[STORAGE_KEY_DARK] ?? false
    language.value = resolveLocale(syncStorage[STORAGE_KEY_LANGUAGE]) ?? locale
    showAlwaysOfflines.value = syncStorage[STORAGE_KEY_SHOW_ALWAYS_OFFLINES] ?? false
    showNoGroup.value = syncStorage[STORAGE_KEY_SHOW_NO_GROUP] ?? false
    streamOrder.value = syncStorage[STORAGE_KEY_STREAM_ORDER] ?? 'name'
    streamOrderSort.value = syncStorage[STORAGE_KEY_STREAM_ORDER_SORT] ?? true
    showGroups.value = syncStorage[STORAGE_KEY_SHOW_GROUPS] ?? false
    showFavorites.value = syncStorage[STORAGE_KEY_SHOW_FAVORITES] ?? false
    showCategoryFavorites.value = syncStorage[STORAGE_KEY_SHOW_CATEGORY_FAVORITES] ?? false
    showCategoryNotifications.value = syncStorage[STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS] ?? false
    showNotifications.value = syncStorage[STORAGE_KEY_SHOW_NOTIFICATIONS] ?? false
    accountsCacheStreams.value = localStorage[STORAGE_KEY_ACCOUNTS_CACHE_STREAMS] ?? {}
    categoryNotifications.value = syncStorage[STORAGE_KEY_CATEGORY_NOTIFICATIONS] ?? []
    groupStreams.value = syncStorage[STORAGE_KEY_GROUP_STREAMS] ?? []
    groupExpanded.value = syncStorage[STORAGE_KEY_GROUP_EXPANDED] ?? []
    categoryFavorites.value = syncStorage[STORAGE_KEY_CATEGORY_FAVORITES] ?? []
    showUpcomings.value = syncStorage[STORAGE_KEY_SHOW_UPCOMINGS] ?? true
    hiddenStreamTypes.value = syncStorage[STORAGE_KEY_HIDDEN_STREAM_TYPES] ?? []

    // Only apply the stored values here, writing them back would waste the sync storage write quota
    applyDark(theme)
    applyLanguage(i18n)
  }

  // utils
  function saveSync<K extends keyof StorageSyncTypes>(key: K, value: StorageSyncTypes[K]) {
    browser.storage.sync.set({ [key]: cloneDeep(value) }).catch((e: unknown) => {
      console.error(`Failed to save "${key}" on sync storage`, e)
    })
  }
  function saveAccounts() {
    saveSync(STORAGE_KEY_ACCOUNTS, accounts.value)
  }
  function getAccountByType(type: AccountStoreType) {
    const value = accounts.value[type]
    if (!value) throw new Error('Account not found')

    return value
  }

  // Storage actions
  /**
   * Expired tokens are renewed with the refresh token. The account is invalid only when it is rejected (or missing,
   * like the accounts logged before it), a network failure tries again later. Concurrent calls share the renew.
   */
  const accountRenews = new Map<AccountStoreType, Promise<void>>()
  async function renewAccountToken(account: AccountStore) {
    if (account.expiresAt === undefined || account.invalid || account.expiresAt > Date.now()) return

    const pending = accountRenews.get(account.type)
    if (pending) return pending
    const renew = (async () => {
      try {
        // Also the new refresh token, when the provider rotates it
        Object.assign(account, await AppBusiness.renewToken(account))
      } catch (e) {
        console.warn(`Failed to renew the ${account.type} token`, e)
        if (!account.refreshToken || (isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized))
          account.invalid = true
      }
      saveAccounts()
    })().finally(() => accountRenews.delete(account.type))
    accountRenews.set(account.type, renew)
    return renew
  }
  /** Renews the tokens about to expire, the popup may stay open longer than a token lasts */
  async function renewAccountTokens() {
    for (const account of compact(Object.values(accounts.value))) await renewAccountToken(account)
  }
  async function fetchAccounts() {
    for (const account of compact(Object.values(accounts.value))) {
      await renewAccountToken(account)
      if (account.invalid && account.expiresAt !== undefined) continue

      try {
        const user = await AppBusiness.getSelfUser(account.token, account.type)
        account.name = user.name
        account.login = user.login
        account.avatarUrl = user.avatarUrl
        account.accountId = user.id
        account.invalid = false
      } catch (e) {
        // A network failure must not log the user out, only a rejected token does
        if (isAxiosError(e) && e.response?.status === HttpStatusCode.Unauthorized) account.invalid = true
      }
    }
    saveAccounts()
  }
  function addAccount(account: Omit<AccountStore, 'id' | 'invalid'>) {
    const accountItem = accounts.value[account.type]
    if (accountItem) {
      accountItem.invalid = false
      accountItem.accountId = account.accountId
      accountItem.name = account.name
      accountItem.login = account.login
      accountItem.avatarUrl = account.avatarUrl
      accountItem.token = account.token
      accountItem.expiresAt = account.expiresAt
      accountItem.refreshToken = account.refreshToken
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
  async function addAuthenticatedAccount({ token, user, expiresAt, refreshToken }: AuthenticatedType) {
    loading()
    try {
      addAccount({
        type: user.type,
        accountId: user.id,
        name: user.name,
        login: user.login,
        avatarUrl: user.avatarUrl,
        token,
        expiresAt,
        refreshToken,
      })

      await fetchAccounts()
      setScreen('home')
    } finally {
      loaded()
    }
  }
  function removeAccount(accountType: AccountStoreType) {
    const account = accounts.value[accountType]
    if (account) {
      delete accounts.value[accountType]
      setAccountCacheStreams(accountType, [])
      // Revoking the Google refresh token revokes its access tokens too, the access token may be expired already
      const token = account.type === 'youtube' ? (account.refreshToken ?? account.token) : account.token
      AppBusiness.revoke(account.type, token).catch((e: unknown) => {
        console.error('Failed to revoke token', e)
      })
    }

    if (!hasAccount.value || isEveryAccountInvalid.value) setScreen('auth')
    saveAccounts()
  }
  /** A rejected token is renewed when the account has a refresh token, it is invalid when that fails too */
  async function invalidAccountByToken(token: string) {
    const value = Object.values(accounts.value).find((value) => value.token === token)
    if (!value) return
    if (value.refreshToken && !value.invalid) {
      value.expiresAt = 0
      return renewAccountToken(value)
    }
    value.invalid = true
    saveAccounts()
  }
  function addNotification(accountType: AccountStoreType, id: string) {
    if (notifications.value.some((value) => value.type === accountType && value.id === id)) return
    notifications.value.push({ type: accountType, id })
    saveSync(STORAGE_KEY_NOTIFICATIONS, notifications.value)
  }
  function removeNotification(accountType: AccountStoreType, id: string) {
    notifications.value = notifications.value.filter((value) => !(value.type === accountType && value.id === id))
    saveSync(STORAGE_KEY_NOTIFICATIONS, notifications.value)
  }
  function addFavorite(accountType: AccountStoreType, id: string) {
    if (favorites.value.some((value) => value.type === accountType && value.id === id)) return
    favorites.value.push({ type: accountType, id })
    saveSync(STORAGE_KEY_FAVORITES, favorites.value)
  }
  function removeFavorite(accountType: AccountStoreType, id: string) {
    favorites.value = favorites.value.filter((value) => !(value.type === accountType && value.id === id))
    saveSync(STORAGE_KEY_FAVORITES, favorites.value)
  }
  function addCategoryNotification(name: string, imageUrl?: string) {
    let item: CategoryNotificationStore | undefined = categoryNotifications.value.find((value) =>
      isSameCategoryName(value.name, name)
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

    saveSync(STORAGE_KEY_CATEGORY_NOTIFICATIONS, categoryNotifications.value)

    return item.id
  }
  function removeCategoryNotification(id: string) {
    categoryNotifications.value = categoryNotifications.value.filter((value) => value.id !== id)

    saveSync(STORAGE_KEY_CATEGORY_NOTIFICATIONS, categoryNotifications.value)
  }
  function cleanAllStreamsFromCategoryNotification(id: string) {
    const item = categoryNotifications.value.find((value) => value.id === id)
    if (!item) return

    item.streams = []

    saveSync(STORAGE_KEY_CATEGORY_NOTIFICATIONS, categoryNotifications.value)
  }
  function addStreamCategoryNotification(id: string, type: AccountStoreType, streamId: string) {
    const item = categoryNotifications.value.find((item) => item.id === id)
    if (!item || item.streams.find((item) => item.type === type && item.id === streamId)) return

    item.streams.push({ type, id: streamId })

    saveSync(STORAGE_KEY_CATEGORY_NOTIFICATIONS, categoryNotifications.value)
  }
  function removeStreamCategoryNotification(id: string, type: AccountStoreType, streamId: string) {
    const item = categoryNotifications.value.find((item) => item.id === id)
    if (!item) return

    item.streams = item.streams.filter((item) => item.type !== type || item.id !== streamId)

    saveSync(STORAGE_KEY_CATEGORY_NOTIFICATIONS, categoryNotifications.value)
  }
  function cleanNotification() {
    notifications.value = []
    saveSync(STORAGE_KEY_NOTIFICATIONS, notifications.value)
  }
  function cleanCategoryNotification() {
    categoryNotifications.value = []
    saveSync(STORAGE_KEY_CATEGORY_NOTIFICATIONS, categoryNotifications.value)
  }
  function cleanFavorite() {
    favorites.value = []
    saveSync(STORAGE_KEY_FAVORITES, favorites.value)
  }
  function cleanCategoryFavorite() {
    categoryFavorites.value = []
    saveSync(STORAGE_KEY_CATEGORY_FAVORITES, categoryFavorites.value)
  }
  function setNotificationType(type: NotificationTypeStore) {
    notificationType.value = type
    saveSync(STORAGE_KEY_NOTIFICATION_TYPE, notificationType.value)
  }
  function applyDark(theme: ThemeInstance) {
    theme.change(dark.value ? 'dark' : 'light')
  }
  function setDark(value: boolean, theme: ThemeInstance) {
    dark.value = value
    applyDark(theme)
    saveSync(STORAGE_KEY_DARK, dark.value)
  }
  function applyLanguage(i18n: Composer) {
    i18n.locale.value = language.value
    document.documentElement.setAttribute('lang', language.value)
  }
  function setLanguage(value: Locales, i18n: Composer) {
    language.value = value
    applyLanguage(i18n)
    saveSync(STORAGE_KEY_LANGUAGE, language.value)
  }
  function setShowAlwaysOfflines(value: boolean) {
    showAlwaysOfflines.value = value
    saveSync(STORAGE_KEY_SHOW_ALWAYS_OFFLINES, showAlwaysOfflines.value)
  }
  function setShowNoGroup(value: boolean) {
    showNoGroup.value = value
    saveSync(STORAGE_KEY_SHOW_NO_GROUP, showNoGroup.value)
  }
  function setAccountCacheStreams(accountType: AccountStoreType, value: StreamItemLiveStreamType[]) {
    accountsCacheStreams.value[accountType] = value
    browser.storage.local
      .set({ [STORAGE_KEY_ACCOUNTS_CACHE_STREAMS]: cloneDeep(accountsCacheStreams.value) })
      .catch((e: unknown) => {
        console.error('Failed to save streams cache on local storage', e)
      })
  }
  async function fetchStreamersFollowed(account: AccountStore): Promise<StreamItemLiveStreamType[]> {
    const streamers = await AppBusiness.getStreamersFollowed(account)
    setAccountCacheStreams(account.type, streamers)
    return streamers
  }
  function addGroupStream(name: string): string {
    const id = crypto.randomUUID()
    groupStreams.value.push({
      id,
      name,
      streams: [],
    })

    saveSync(STORAGE_KEY_GROUP_STREAMS, groupStreams.value)

    return id
  }
  function removeGroupStream(id: string): void {
    groupStreams.value = groupStreams.value.filter((value) => value.id !== id)

    saveSync(STORAGE_KEY_GROUP_STREAMS, groupStreams.value)
  }
  function editGroupStream(id: string, patch: Partial<Omit<GroupStreamStore, 'id' | 'streams'>>): void {
    const group = groupStreams.value.find((value) => value.id === id)
    if (!group) return
    if (patch.name !== undefined && !patch.name.trim()) return

    Object.assign(group, patch)

    saveSync(STORAGE_KEY_GROUP_STREAMS, groupStreams.value)
  }
  function addStreamToGroupStream(id: string, streamTypeId: AccountStoreType, streamId: string): void {
    const group = groupStreams.value.find((value) => value.id === id)
    if (!group || group.streams.some((value) => value.id === streamId && value.type === streamTypeId)) return

    group.streams.push({ id: streamId, type: streamTypeId })

    saveSync(STORAGE_KEY_GROUP_STREAMS, groupStreams.value)
  }
  function removeStreamFromGroupStream(id: string, streamTypeId: AccountStoreType, streamId: string): void {
    const group = groupStreams.value.find((value) => value.id === id)
    if (!group) return

    group.streams = group.streams.filter((value) => !(value.id === streamId && value.type === streamTypeId))

    saveSync(STORAGE_KEY_GROUP_STREAMS, groupStreams.value)
  }
  function addFavoriteCategory(category: FavoriteGroup): void {
    const favoriteCategory = categoryFavorites.value.find(
      (value) => value.id === category.id && value.type === category.type
    )
    if (favoriteCategory) return

    categoryFavorites.value = [...categoryFavorites.value, category]

    saveSync(STORAGE_KEY_CATEGORY_FAVORITES, categoryFavorites.value)
  }
  function removeFavoriteCategory(category: FavoriteGroup): void {
    const favoriteCategory = categoryFavorites.value.find(
      (value) => value.id === category.id && value.type === category.type
    )
    if (!favoriteCategory) return

    categoryFavorites.value = categoryFavorites.value.filter(
      (value) => !(value.id === category.id && value.type === category.type)
    )

    saveSync(STORAGE_KEY_CATEGORY_FAVORITES, categoryFavorites.value)
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
    browser.storage.sync
      .set({
        [STORAGE_KEY_STREAM_ORDER]: streamOrder.value,
        [STORAGE_KEY_STREAM_ORDER_SORT]: streamOrderSort.value,
      })
      .catch((e: unknown) => {
        console.error('Failed to save stream order on sync storage', e)
      })
  }
  function setStreamNameFilter(value: string) {
    streamNameFilter.value = value
  }
  function setCategoryNameFilter(value: string) {
    categoryNameFilter.value = value
  }
  function setShowGroups(value: boolean) {
    showGroups.value = value
    saveSync(STORAGE_KEY_SHOW_GROUPS, showGroups.value)
  }
  function setShowFavorites(value: boolean) {
    showFavorites.value = value
    saveSync(STORAGE_KEY_SHOW_FAVORITES, showFavorites.value)
  }
  function setShowcategoryFavorites(value: boolean) {
    showCategoryFavorites.value = value
    saveSync(STORAGE_KEY_SHOW_CATEGORY_FAVORITES, showCategoryFavorites.value)
  }
  function setShowCategoryNotifications(value: boolean) {
    showCategoryNotifications.value = value
    saveSync(STORAGE_KEY_SHOW_CATEGORY_NOTIFICATIONS, showCategoryNotifications.value)
  }
  function setShowNotifications(value: boolean) {
    showNotifications.value = value
    saveSync(STORAGE_KEY_SHOW_NOTIFICATIONS, showNotifications.value)
  }
  function setGroupExpanded(value: string[]) {
    groupExpanded.value = value
    saveSync(STORAGE_KEY_GROUP_EXPANDED, groupExpanded.value)
  }
  function setShowUpcomings(value: boolean) {
    showUpcomings.value = value
    saveSync(STORAGE_KEY_SHOW_UPCOMINGS, showUpcomings.value)
  }
  function toggleHiddenStreamType(value: AccountStoreType) {
    hiddenStreamTypes.value = hiddenStreamTypes.value.includes(value)
      ? hiddenStreamTypes.value.filter((type) => type !== value)
      : [...hiddenStreamTypes.value, value]
    saveSync(STORAGE_KEY_HIDDEN_STREAM_TYPES, hiddenStreamTypes.value)
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
    categoryFavorites,
    // view
    streamFilter,
    streamOrder,
    streamOrderSort,
    streamNameFilter,
    showUpcomings,
    hiddenStreamTypes,
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
    showCategoryFavoritesComp,
    showCategoryNotificationsComp,
    showNotificationsComp,
    groupExpandedComp,
    showUpcomingsComp,
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
    renewAccountToken,
    renewAccountTokens,
    fetchAccounts,
    addAccount,
    addAuthenticatedAccount,
    removeAccount,
    invalidAccountByToken,
    addNotification,
    removeNotification,
    addFavorite,
    removeFavorite,
    addCategoryNotification,
    removeCategoryNotification,
    cleanAllStreamsFromCategoryNotification,
    addStreamCategoryNotification,
    removeStreamCategoryNotification,
    cleanNotification,
    cleanCategoryNotification,
    cleanFavorite,
    cleanCategoryFavorite,
    setNotificationType,
    setDark,
    setLanguage,
    setShowAlwaysOfflines,
    setShowNoGroup,
    setAccountCacheStreams,
    fetchStreamersFollowed,
    addGroupStream,
    removeGroupStream,
    editGroupStream,
    addStreamToGroupStream,
    removeStreamFromGroupStream,
    addFavoriteCategory,
    removeFavoriteCategory,
    // view action
    setStreamOrder,
    toggleHiddenStreamType,
    // video view action,
    setVideoOrder,
    // clip view action,
    setClipPeriod,
    // category stream view action,
    setLanguageCategoryStream,
  }
})

export default useSystemStore
