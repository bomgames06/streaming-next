<template>
  <v-container>
    <template v-if="!category">
      <v-row dense>
        <v-col v-for="item in categories" :key="item.id" cols="4">
          <v-card class="pa-1" width="100%" @click="selectCategory(item)">
            <div>
              <v-img
                :src="formatThumbnailCategory(item)"
                :alt="$t('category_thumbnail', { name: item.name })"
              />
            </div>
            <div class="font-weight-bold ellipse">
              <span :title="item.name">{{item.name}}</span>
            </div>
          </v-card>
        </v-col>
      </v-row>
      <v-btn
        v-if="categoriesPage"
        block
        height="54"
        :loading="loadingCategories"
        :disabled="loadingCategories"
        class="mt-2"
        @click="loadTopCategories(true)"
      >
        <v-icon class="mr-2">
          mdi-magnify
        </v-icon>
        <span>{{$t('fetch_more')}}</span>
      </v-btn>
    </template>
    <v-row v-else>
      <v-col v-if="!itemExpandedSelect" cols="12">
        <v-card class="pa-1 d-flex" @click="category = null">
          <v-img
            :src="formatThumbnailCategory(category)"
            width="75"
            max-width="75"
            :alt="$t('category_thumbnail', { name: category.name })"
            class="d-inline-block mr-2"
          />
          <div>
            <div class="d-inline-block category-title" :title="category.name">
              <span class="text-h6">
                {{category.name}}
              </span>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12">
        <streamers-list
          :items="streamersOrder"
          :item-expanded-select.sync="itemExpandedSelect"
          :dump-date="dumpDate"
          :expanded-mode.sync="expandedMode"
          mode="CATEGORY_STREAM"
          @click="openTwitchLink"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {
  Component,
  InjectReactive,
  Watch,
  Vue,
  PropSync,
} from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import UserType from '@/types/user-type';
import TwitchApiService from '@/services/twitch-api/twitch-api-service';
import CategoryType from '@/types/category-type';
import StreamersType from '@/types/streamers-type';
import StreamersList from '@/components/StreamersList.vue';
import { debounce, orderBy } from 'lodash';
import LanguageIso6391Type from '@/types/language-iso639-1-type';
import ModeType from '@/types/mode-type';

@Component({
  components: { StreamersList },
})
export default class StreamsFollowing extends Vue {
  @InjectReactive('user')
  private readonly user?: UserType | null;

  @PropSync('categoryId')
  syncedCategoryId?: string | null;

  appStore = getModule(AppStore, this.$store);

  categories: CategoryType[] = [];

  category: CategoryType | null = null

  streamers: StreamersType[] = [];

  query = '';

  first = true;

  itemExpandedSelect: StreamersType | null = null;

  dumpDate: Date = new Date();

  loadingCategories = false;

  loadingCategoryStreamers = false;

  expandedMode: ModeType = 'NORMAL';

  categoriesPage: string | null = null;

  loadTopCategoriesDebounce = debounce(this.loadTopCategories, 500);

  loadStreamersByCategoryDebounce = debounce(this.loadStreamersByCategory, 500);

  get hasUser(): boolean {
    return !!this.user;
  }

  get filterLanguage(): LanguageIso6391Type | null {
    return this.appStore.filterLanguageCategoryStreamList;
  }

  @Watch('hasUser')
  onHasAuth(): void {
    if (this.first) {
      this.first = false;
      return;
    }
    this.loadTopCategoriesDebounce();
  }

  @Watch('filterLanguage')
  onFilterLanguage(): void {
    this.loadStreamersByCategoryDebounce();
  }

  @Watch('category', { immediate: true })
  onCategory(): void {
    this.appStore.setFilterCategorySelected(!!this.category);
  }

  created(): void {
    this.loadTopCategoriesDebounce();
    if (this.syncedCategoryId) {
      this.loadCategory();
      this.syncedCategoryId = null;
    }
  }

  get streamersOrder(): StreamersType[] {
    return orderBy(this.streamers, ['viewers'], ['desc']);
  }

  async loadTopCategories(nextPage?: boolean): Promise<void> {
    if (!this.user) {
      this.categories = [];
      return;
    }
    if (this.loadingCategories) return;
    try {
      this.loadingCategories = true;
      this.appStore.loading();
      const categoriesPagination = await TwitchApiService.games.topGames(
        nextPage && this.categoriesPage ? this.categoriesPage : undefined,
        99,
        this.appStore.auth?.accessToken,
      );
      if (nextPage) {
        this.categories.push(...categoriesPagination.data);
      } else {
        this.categories = categoriesPagination.data;
      }
      this.categoriesPage = categoriesPagination.pagination
        && categoriesPagination.pagination.cursor;
    } catch (e) {
      this.categories = [];
    } finally {
      this.loadingCategories = false;
      this.appStore.loaded();
    }
  }

  async loadCategory(): Promise<void> {
    if (!this.syncedCategoryId) return;
    if (!this.user) {
      this.category = null;
      return;
    }
    try {
      this.appStore.loading();
      this.category = await TwitchApiService.games.getGame(
        this.syncedCategoryId,
        undefined,
        undefined,
        this.appStore.auth?.accessToken,
      );
      if (this.category) await this.loadStreamersByCategory();
    } catch (e) {
      this.category = null;
    } finally {
      this.syncedCategoryId = null;
      this.loadingCategories = false;
      this.appStore.loaded();
    }
  }

  formatThumbnailCategory(category: CategoryType): string {
    if (!category.boxArtUrl) return '';
    return `${category.boxArtUrl
      .replace('{width}', '150')
      .replace('{height}', '207')}`;
  }

  selectCategory(item: CategoryType): void {
    this.streamers = [];
    this.category = item;
    this.loadStreamersByCategoryDebounce();
  }

  async loadStreamersByCategory(): Promise<void> {
    if (!this.category) {
      this.streamers = [];
      return;
    }
    if (this.loadingCategoryStreamers) return;
    try {
      this.loadingCategoryStreamers = true;
      this.appStore.loading();
      this.streamers = await TwitchApiService.streamers.getStreams(
        [this.category.id],
        this.filterLanguage ? this.filterLanguage.language : undefined,
        undefined,
        undefined,
        this.appStore.auth?.accessToken,
      );
      this.dumpDate = new Date();
    } catch (e) {
      this.streamers = [];
    } finally {
      this.loadingCategoryStreamers = false;
      this.appStore.loaded();
    }
  }

  refresh(): void {
    if (!this.category) {
      this.loadTopCategoriesDebounce();
    } else {
      this.loadStreamersByCategoryDebounce();
    }
  }

  openTwitchLink(streamer: StreamersType): void {
    window.open(`https://www.twitch.tv/${streamer.login}`, '_blank');
  }
}
</script>

<style lang="scss" scoped>
.img-category {
  width: 75px;
}
.category-title {
  overflow: hidden;
  height: 103px;
}
</style>
