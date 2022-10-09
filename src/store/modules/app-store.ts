import {
  Action,
  Module,
  Mutation,
  VuexModule,
} from 'vuex-module-decorators';
import AuthType from '@/types/auth-type';
import Vue from 'vue';
import FilterOrderType from '@/types/filter-order-type';
import LanguageIso6391Type from '@/types/language-iso639-1-type';

@Module({ name: 'AppStore' })
export default class AppStore extends VuexModule {
  _loading = 0;

  _drawer = false;

  _auth: AuthType | null = null;

  _filterList = '';

  _filterOrderList: FilterOrderType = 'NAME';

  _filterCategoryList = '';

  _filterLanguageCategoryStreamList: LanguageIso6391Type | null = null;

  _filterOrderAsc = true;

  _filterCategorySelected = false;

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

  get filterOrderList(): FilterOrderType {
    return this._filterOrderList;
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
  _setFilterOrderList(filterOrderList: FilterOrderType) {
    if (this._filterOrderList === filterOrderList) {
      this._filterOrderAsc = !this._filterOrderAsc;
      return;
    }
    this._filterOrderList = filterOrderList;
    this._filterOrderAsc = true;
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
  }

  @Action
  setAccessToken(accessToken: string | null) {
    this.context.commit('_setAccessToken', accessToken);
    Vue.$cookies.set('accessToken', accessToken);
  }

  @Action
  setFilterList(filterList: string) {
    this.context.commit('_setFilterList', filterList);
  }

  @Action
  setFilterOrderList(filterOrderList: FilterOrderType) {
    this.context.commit('_setFilterOrderList', filterOrderList);
    Vue.$cookies.set('filterOrderList', this.context.getters.filterOrderList);
    Vue.$cookies.set('filterOrderAsc', this.context.getters.filterOrderAsc);
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
    Vue.$cookies.set('filterOrderList', this.context.getters.filterOrderList);
  }

  @Action
  setFilterOrderAscNative(filterOrderAsc: boolean) {
    this.context.commit('_setFilterOrderAscNative', filterOrderAsc);
    Vue.$cookies.set('filterOrderAsc', this.context.getters.filterOrderAsc);
  }

  @Action
  setFilterCategorySelected(filterCategorySelected: boolean) {
    this.context.commit('_setFilterCategorySelected', filterCategorySelected);
  }
}
