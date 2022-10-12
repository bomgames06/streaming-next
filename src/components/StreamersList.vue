<template>
  <v-list dense three-line :class="getListClass()">
    <template v-for="(item, idx) in items">
      <v-hover #default="listItem" :key="`C:${item.online}:${item.id}`">
        <div
          :class="!syncedItemExpandedSelect || syncedItemExpandedSelect.id === item.id
          ? 'd-flex' : 'd-none'"
        >
          <v-card
            :color="enabledCard ? '' : 'transparent'"
            width="100%"
          >
            <v-list-item
              dense
              class="flex-nowrap pa-1 list-item flex-grow-1"
              @click="clickItem(item)"
              @contextmenu.prevent="showMenu($event, item)"
            >
              <v-list-item-icon class="list-item-img">
                <v-img
                  :aspect-ratio="16/9"
                  :src="formatThumbnailStreamer(item)"
                  :width="imgWidth"
                  eager
                  :alt="formatAltImg(item)"
                >
                  <v-card
                    v-if="(listItem.hover && item.online) || mode === 'VOD'"
                    width="min-content"
                    class="px-1 timer-content"
                  >
                    {{getStreamerDuration(item)}}
                  </v-card>
                  <v-card
                    v-if="mode !== 'VOD' && appStore.notification === 'partial'
                    && appStore.notificationIds.includes(item.id)"
                    width="min-content"
                    class="notification-content"
                  >
                    <v-icon x-small :color="$vuetify.theme.dark ? 'yellow' : 'warning'">
                      mdi-star
                    </v-icon>
                  </v-card>
                </v-img>
              </v-list-item-icon>
              <v-list-item-content class="pa-0 align-self-start">
                <v-list-item-title
                  class="one-line ma-0 text-body-2 font-weight-bold"
                  :title="formatViewCount(item)"
                >
                  <span class="d-inline-flex">{{item.nickname || item.login}}</span>
                  <span
                    v-if="item.online && mode !== 'CHANNEL'"
                    class="v-list-item__subtitle d-inline-flex"
                  >
                    &nbsp;- {{ formatViewCount(item) }}
                  </span>
                </v-list-item-title>
                <template v-if="item.online">
                  <v-list-item-subtitle v-if="mode !== 'VOD'" class="one-line ma-0">
                    <span :title="formatGameView(item)">
                      {{ formatGameView(item) }}
                    </span>
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="one-line ma-0">
                    <span :title="item.title">{{item.title}}</span>
                  </v-list-item-subtitle>
                  <v-list-item-subtitle v-if="mode === 'VOD'" class="one-line ma-0">
                    <span :title="formatCreatedAtVod(item)">
                      {{formatCreatedAtVod(item)}}
                    </span>
                  </v-list-item-subtitle>
                </template>
                <template v-else>
                  <v-list-item-subtitle class="one-line ma-0">
                    {{$t('offline')}}
                  </v-list-item-subtitle>
                </template>
              </v-list-item-content>
            </v-list-item>
          </v-card>
        </div>
      </v-hover>
      <div
        v-show="syncedItemExpandedSelect && syncedItemExpandedSelect.id === item.id"
        :key="`S:${item.online}:${item.id}`"
        class="flex-grow-1 relative"
      >
        <template v-if="syncedItemExpandedSelect && syncedItemExpandedSelect.id === item.id">
          <template v-if="syncedExpandedMode === 'STREAM'">
            <iframe
              :src="`https://player.twitch.tv/?channel=${item.login}&parent=dfebgcjlpoeejpkdphklicngpomckedk.chromiumapp.org`"
              title="teste"
              class="full-absolute"
            />
          </template>
          <template v-if="syncedExpandedMode === 'VOD'">
            <span class="text-h6 mt-2">{{$t('videos')}}</span>
            <v-divider class="my-1" />
            <streamers-list
              :items="videos"
              mode="VOD"
              :dump-date="dumpDateVideo"
              class="py-2"
            />
            <v-btn
              v-if="videosPage"
              block
              height="54"
              :loading="loadingVideo"
              :disabled="loadingVideo"
              @click="loadVideos(syncedItemExpandedSelect.id, true)"
            >
              <v-icon class="mr-2">
                mdi-magnify
              </v-icon>
              <span>{{$t('fetch_more')}}</span>
            </v-btn>
          </template>
        </template>
      </div>
      <v-divider
        v-show="idx < (items.length - 1) && !syncedItemExpandedSelect"
        :key="`D:${item.online}:${item.id}`"
        class="my-1"
      />
    </template>
    <v-menu
      v-model="menu.show"
      :position-x="menu.x"
      :position-y="menu.y"
      absolute
      offset-y
    >
      <v-list dense class="list-content-mini">
        <v-list-item
          v-if="menu.streamer"
          dense
          class="user-selection-none"
          @click="notification"
        >
          <v-list-item-icon class="mr-2">
            <v-icon small>
              mdi-star
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{$t(!appStore.notificationIds.includes(menu.streamer.id) ?
              'enable_notification' : 'disable_notification')}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          dense
          class="user-selection-none"
          @click="$emit('click-category', menu.streamer.gameId)"
        >
          <v-list-item-icon class="mr-2">
            <v-icon small>
              mdi-controller
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{$t('open_category')}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item dense class="user-selection-none" @click="clickShowVideo">
          <v-list-item-icon class="mr-2">
            <v-icon small>
              mdi-video
            </v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{$t('videos')}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-list>
</template>

<script lang="ts">
import {
  Component,
  Prop,
  PropSync,
  Vue, Watch,
} from 'vue-property-decorator';
import StreamersType from '@/types/streamers-type';
import VueI18n from 'vue-i18n';
import VideosType from '@/types/videos-type';
import TwitchApiService from '@/services/twitch-api/twitch-api-service';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import { getDurationVod } from '@/utils/utils';
import ModeType from '@/types/mode-type';
import FilterOrderVodType from '@/types/filter-order-vod-type';
import ChannelType from '@/types/channel-type';

type MenuStreamer = {
  streamer: StreamersType | null,
  show: boolean,
  x: number,
  y: number,
}

// eslint-disable-next-line no-use-before-define
@Component({ components: { StreamersList } })
export default class StreamersList extends Vue {
  @Prop({ required: true })
  readonly items?: StreamersType[] | VideosType[] | ChannelType[];

  @Prop({ required: true })
  dumpDate?: Date;

  @Prop({ required: true })
  mode?: 'STREAM' | 'CATEGORY_STREAM' | 'VOD' | 'CHANNEL';

  @PropSync('itemExpandedSelect')
  syncedItemExpandedSelect?: StreamersType | null;

  @PropSync('expandedMode', { default: 'NORMAL' })
  syncedExpandedMode?: ModeType;

  appStore = getModule(AppStore, this.$store);

  imgWidth = 90;

  currentTimeInterval?: number | null;

  currentTime = this.$moment();

  videos: VideosType[] = [];

  videosPage: string | null = null;

  loadingVideo = false;

  dumpDateVideo = new Date();

  menu: MenuStreamer = {
    streamer: null,
    show: false,
    x: 0,
    y: 0,
  }

  get enabledCard(): boolean {
    return !!this.syncedItemExpandedSelect;
  }

  @Watch('syncedExpandedMode')
  onChangeSyncedExpandedMode(): void {
    if (!this.syncedExpandedMode) return;
    this.appStore.setMode(this.syncedExpandedMode);
  }

  get filterOrderVodList(): FilterOrderVodType {
    return this.appStore.filterOrderVodList;
  }

  @Watch('filterOrderVodList')
  onChangeFilterOrderVodList(): void {
    if (!this.syncedItemExpandedSelect) return;
    this.loadVideos(this.syncedItemExpandedSelect.id);
  }

  created(): void {
    this.currentTimeInterval = setInterval(this.fetchCurrentTime, 1000);
  }

  beforeDestroy(): void {
    if (this.currentTimeInterval) {
      clearInterval(this.currentTimeInterval);
      this.currentTimeInterval = null;
    }
  }

  fetchCurrentTime(): void {
    this.currentTime = this.$moment();
  }

  formatThumbnailStreamer(item: StreamersType | VideosType | ChannelType): string {
    if (this.mode === 'CHANNEL') {
      return (item as ChannelType).thumbnailUrl;
    }
    if (item.online || this.mode === 'VOD') {
      if (!item.thumbnailUrl) return '';
      const width = this.imgWidth + 200;
      return `${item.thumbnailUrl
        .replace(this.mode === 'VOD' ? '%{width}' : '{width}', width.toFixed())
        .replace(this.mode === 'VOD' ? '%{height}' : '{height}', ((width * 9) / 16)
          .toFixed())}&dump=${this.dumpDate}`;
    }
    item = (item as StreamersType);
    if (!item.profileImage) return '';
    return item.profileImage;
  }

  formatAltImg(streamer: StreamersType): VueI18n.TranslateResult {
    if (this.mode === 'VOD') {
      return this.$t('streamer_video_thumbnail', { name: streamer.nickname });
    }
    if (streamer.online) {
      return this.$t('streamer_thumbnail', { name: streamer.nickname });
    }
    return this.$t('streamer_profile_thumbnail', { name: streamer.nickname });
  }

  formatGameView(streamer: StreamersType): string {
    return `${streamer.gameName}`;
  }

  formatViewCount(streamer: StreamersType): string {
    const viewers = streamer.viewers || 0;
    return `${viewers.toLocaleString(this.$i18n.locale)} ${(this.$t('viewers') as string).toLowerCase()}`;
  }

  getStreamerDuration(item: StreamersType | VideosType): string {
    if (this.mode === 'VOD') {
      return getDurationVod((item as VideosType).duration)
        .format('hh:mm:ss', { trim: false });
    }
    return this.$moment.duration(this.currentTime.diff((item as StreamersType).startedAt))
      .format('hh:mm:ss', { trim: false });
  }

  formatCreatedAtVod(video: VideosType): string {
    return this.$moment.duration(this.$moment().diff(video.createdAt))
      .format(
        'y __ w __ d __ h __ m __ s __',
        { largest: 1 },
      );
  }

  getListClass(): any {
    return {
      transparent: true,
      'pa-0': true,
      'fill-height': !!this.syncedItemExpandedSelect && this.syncedExpandedMode !== 'VOD',
      'd-flex': !!this.syncedItemExpandedSelect && this.syncedExpandedMode !== 'VOD',
      'flex-column': !!this.syncedItemExpandedSelect && this.syncedExpandedMode !== 'VOD',
    };
  }

  showMenu(e: MouseEvent, streamer: StreamersType): void {
    if (this.mode === 'VOD') return;
    this.menu.show = false;
    this.menu.streamer = streamer;
    this.menu.x = e.clientX;
    this.menu.y = e.clientY;
    this.$nextTick(() => {
      this.menu.show = true;
    });
  }

  clickItem(item: StreamersType | VideosType): void {
    if (this.mode === 'VOD') {
      window.open((item as VideosType).url, '_blank');
      return;
    }
    if (!this.syncedItemExpandedSelect) {
      this.$emit('click', item);
      return;
    }
    this.syncedItemExpandedSelect = null;
    this.syncedExpandedMode = 'NORMAL';
  }

  clickShowVideo(): void {
    if (!this.menu.show || !this.menu.streamer) return;
    this.videos = [];
    this.syncedExpandedMode = 'VOD';
    this.syncedItemExpandedSelect = this.menu.streamer;
    this.loadVideos(this.menu.streamer.id);
  }

  notification(): void {
    if (!this.menu.show || !this.menu.streamer) return;
    if (this.appStore.notificationIds.includes(this.menu.streamer.id)) {
      this.appStore.delNotification(this.menu.streamer.id);
    } else {
      this.appStore.addNotification(this.menu.streamer.id);
    }
  }

  async loadVideos(id: string, nextPage?: boolean): Promise<void> {
    if (this.loadingVideo) return;
    try {
      this.loadingVideo = true;
      this.appStore.loading();
      const videosPagination = await TwitchApiService.videos.getVideos(
        id,
        this.appStore.filterOrderVodList,
        nextPage && this.videosPage ? this.videosPage : undefined,
        this.appStore.auth?.accessToken,
      );
      if (nextPage) {
        this.videos.push(...videosPagination.data);
      } else {
        this.videos = videosPagination.data;
      }
      this.videosPage = videosPagination.pagination && videosPagination.pagination.cursor;
    } catch (e) {
      this.videos = [];
    } finally {
      this.loadingVideo = false;
      this.appStore.loaded();
    }
  }
}
</script>

<style lang="scss" scoped>
.list-item {
  min-height: unset !important;
  height: 59px !important;
}
.list-item-img {
  height: unset !important;
  margin: 0 !important;
  margin-right: 6px !important;
}
.list-item-action {
  height: 100% !important;
  margin: 0 !important;
}
.timer-content {
  position: absolute;
  bottom: 1px;
  right: 1px;
  font-size: 10px;
}
.notification-content {
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: 10px;
  padding: 2px;
}
.game-button {
  letter-spacing: normal !important;
}
</style>
