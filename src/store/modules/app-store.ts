import {
  Action,
  Module,
  Mutation,
  VuexModule,
} from 'vuex-module-decorators';
import AuthType from '@/types/auth-type';
import FilterOrderType from '@/types/filter-order-type';
import LanguageIso6391Type from '@/types/language-iso639-1-type';
import ModeType from '@/types/mode-type';
import FilterOrderVodType from '@/types/filter-order-vod-type';
import NotificationsType from '@/types/notifications-type';

@Module({ name: 'AppStore' })
export default class AppStore extends VuexModule {
  _loading = 0;

  _drawer = false;

  _auth: AuthType | null = null;

  _filterList = '';

  _filterChannelList = '';

  _filterOrderList: FilterOrderType = 'NAME';

  _filterOrderVodList: FilterOrderVodType = 'time';

  _filterCategoryList = '';

  _filterLanguageCategoryStreamList: LanguageIso6391Type | null = null;

  _filterOrderAsc = true;

  _filterCategorySelected = false;

  _mode: ModeType = 'NORMAL';

  _notification: NotificationsType = 'none';

  _notificationIds: string[] = [];

  _showAlwaysOfflines = false;

  get isLoading(): boolean {
    return this._loading > 0;
  }

  get drawer(): boolean {
    return this._drawer;
  }

  get hasAuth(): boolean {
    return !!this._auth;
  }

  get auth(): AuthType | null {
    return this._auth;
  }

  get filterList(): string {
    return this._filterList;
  }

  get filterChannelList(): string {
    return this._filterChannelList;
  }

  get filterOrderList(): FilterOrderType {
    return this._filterOrderList;
  }

  get filterOrderVodList(): FilterOrderVodType {
    return this._filterOrderVodList;
  }

  get filterCategoryList(): string {
    return this._filterCategoryList;
  }

  get filterLanguageCategoryStreamList(): LanguageIso6391Type | null {
    return this._filterLanguageCategoryStreamList;
  }

  get filterOrderAsc(): boolean {
    return this._filterOrderAsc;
  }

  get filterCategorySelected(): boolean {
    return this._filterCategorySelected;
  }

  get mode(): ModeType {
    return this._mode;
  }

  get notification(): NotificationsType {
    return this._notification;
  }

  get notificationIds(): string[] {
    return this._notificationIds;
  }

  get showAlwaysOfflines(): boolean {
    return this._showAlwaysOfflines;
  }

  @Mutation
  _incrementLoading() {
    this._loading += 1;
  }

  @Mutation
  _decrementLoading() {
    if (this._loading <= 0) return;
    this._loading -= 1;
  }

  @Mutation
  _toggleDrawer() {
    this._drawer = !this._drawer;
  }

  @Mutation
  _setDrawer(value: boolean) {
    this._drawer = value;
  }

  @Mutation
  _setAccessToken(accessToken: string | null) {
    this._auth = accessToken ? { accessToken } : null;
  }

  @Mutation
  _setFilterList(filterList: string) {
    this._filterList = filterList;
  }

  @Mutation
  _setFilterChannelList(filterChannelList: string) {
    this._filterChannelList = filterChannelList;
  }

  @Mutation
  _setFilterOrderList(filterOrderList: FilterOrderType) {
    if (this._filterOrderList === filterOrderList) {
      this._filterOrderAsc = !this._filterOrderAsc;
      return;
    }
    this._filterOrderList = filterOrderList;
    this._filterOrderAsc = true;
  }

  @Mutation
  _setFilterOrderVodList(filterOrderVodList: FilterOrderVodType) {
    this._filterOrderVodList = filterOrderVodList;
  }

  @Mutation
  _setFilterCategoryList(filterCategoryList: string) {
    this._filterCategoryList = filterCategoryList;
  }

  @Mutation
  _setFilterLanguageCategoryStreamList(
    filterLanguageCategoryStreamList: LanguageIso6391Type | null,
  ) {
    this._filterLanguageCategoryStreamList = filterLanguageCategoryStreamList;
  }

  @Mutation
  _setFilterOrderListNative(filterOrderList: FilterOrderType) {
    this._filterOrderList = filterOrderList;
  }

  @Mutation
  _setFilterOrderAscNative(filterOrderAsc: boolean) {
    this._filterOrderAsc = filterOrderAsc;
  }

  @Mutation
  _setFilterCategorySelected(filterCategorySelected: boolean) {
    this._filterCategorySelected = filterCategorySelected;
  }

  @Mutation
  _setMode(mode: ModeType) {
    this._mode = mode;
  }

  @Mutation
  _setNotification(notification: NotificationsType): void {
    this._notification = notification;
  }

  @Mutation
  _addNotification(notificationId: string): void {
    this._notificationIds.push(notificationId);
    this._notificationIds = [...this._notificationIds];
  }

  @Mutation
  _delNotification(notificationId: string): void {
    const index = this._notificationIds.indexOf(notificationId);
    if (index < 0) return;
    this._notificationIds.splice(index, 1);
    this._notificationIds = [...this._notificationIds];
  }

  @Mutation
  _setNotificationIds(notificationIds: string[]): void {
    this._notificationIds = notificationIds;
  }

  @Mutation
  _setShowAlwaysOfflines(showAlwaysOfflines: boolean): void {
    this._showAlwaysOfflines = showAlwaysOfflines;
  }

  @Action
  loading() {
    this.context.commit('_incrementLoading');
  }

  @Action
  loaded() {
    this.context.commit('_decrementLoading');
  }

  @Action
  toggleDrawer() {
    this.context.commit('_toggleDrawer');
  }

  @Action
  setDrawer(value: boolean) {
    this.context.commit('_setDrawer', value);
    this.setMode('NORMAL');
  }

  @Action
  setAccessToken(accessToken: string | null) {
    this.context.commit('_setAccessToken', accessToken);
    browser.storage.local.set({ accessToken }).then();
  }

  @Action
  setFilterList(filterList: string) {
    this.context.commit('_setFilterList', filterList);
  }

  @Action
  setFilterChannelList(filterChannelList: string) {
    this.context.commit('_setFilterChannelList', filterChannelList);
  }

  @Action
  setFilterOrderList(filterOrderList: FilterOrderType) {
    this.context.commit('_setFilterOrderList', filterOrderList);
    browser.storage.local.set({ filterOrderList: this.context.getters.filterOrderList }).then();
    browser.storage.local.set({ filterOrderAsc: this.context.getters.filterOrderAsc }).then();
  }

  @Action
  setFilterOrderVodList(filterOrderVodList: FilterOrderVodType) {
    this.context.commit('_setFilterOrderVodList', filterOrderVodList);
    browser.storage.local.set({ filterOrderVodList: this.context.getters.filterOrderVodList })
      .then();
  }

  @Action
  setFilterCategoryList(filterCategoryList: string) {
    this.context.commit('_setFilterCategoryList', filterCategoryList);
  }

  @Action
  setFilterLanguageCategoryStreamList(
    filterLanguageCategoryStreamList: LanguageIso6391Type | null,
  ) {
    this.context.commit(
      '_setFilterLanguageCategoryStreamList',
      filterLanguageCategoryStreamList,
    );
  }

  @Action
  setFilterOrderListNative(filterOrderList: FilterOrderType) {
    this.context.commit('_setFilterOrderListNative', filterOrderList);
    browser.storage.local.set({ filterOrderList: this.context.getters.filterOrderList }).then();
  }

  @Action
  setFilterOrderAscNative(filterOrderAsc: boolean) {
    this.context.commit('_setFilterOrderAscNative', filterOrderAsc);
    browser.storage.local.set({ filterOrderAsc: this.context.getters.filterOrderAsc }).then();
  }

  @Action
  setFilterCategorySelected(filterCategorySelected: boolean) {
    this.context.commit('_setFilterCategorySelected', filterCategorySelected);
  }

  @Action
  setMode(mode: ModeType) {
    this.context.commit('_setMode', mode);
  }

  @Action
  setNotification(notification: NotificationsType) {
    this.context.commit('_setNotification', notification);
    browser.storage.local.set({ notification: this.context.getters.notification }).then();
  }

  @Action
  setShowAlwaysOfflines(showAlwaysOfflines: boolean) {
    this.context.commit('_setShowAlwaysOfflines', showAlwaysOfflines);
    browser.storage.local.set({ showAlwaysOfflines: this.context.getters.showAlwaysOfflines })
      .then();
  }

  @Action
  addNotification(notificationId: string) {
    this.context.commit('_addNotification', notificationId);
    browser.storage.local.set({ notificationIds: this.context.getters.notificationIds }).then();
  }

  @Action
  delNotification(notificationId: string) {
    this.context.commit('_delNotification', notificationId);
    browser.storage.local.set({ notificationIds: this.context.getters.notificationIds }).then();
  }

  @Action
  setNotificationIds(notificationIds: string[]) {
    this.context.commit('_setNotificationIds', notificationIds || []);
    browser.storage.local.set({ notificationIds: this.context.getters.notificationIds }).then();
  }
}
