<template>
  <v-list dense three-line :class="getListClass()">
    <template v-for="(item, idx) in items">
      <v-hover #default="{ hover }" :key="`C:${item.online}:${item.id}`">
        <div
          :class="!syncedItemExpandedSelect || syncedItemExpandedSelect.id === item.id
          ? 'd-flex' : 'd-none'"
        >
          <v-list-item
            dense
            class="flex-nowrap pa-1 list-item flex-grow-1"
            @click="$emit('click', item)"
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
                  v-if="hover && item.online"
                  width="min-content"
                  class="px-1 timer-content"
                >
                  {{getStreamerDuration(item)}}
                </v-card>
              </v-img>
            </v-list-item-icon>
            <v-list-item-content class="pa-0 align-self-start">
              <v-list-item-title
                class="one-line ma-0 text-body-2 font-weight-bold"
                :title="formatViewCount(item)"
              >
                <span class="d-inline-flex">{{item.nickname || item.login}}</span>
                <span v-if="item.online" class="v-list-item__subtitle d-inline-flex">
                    &nbsp;- {{ formatViewCount(item) }}
                  </span>
              </v-list-item-title>
              <template v-if="item.online">
                <v-list-item-subtitle class="one-line ma-0">
                  <span
                    v-if="categoryMode"
                    :title="formatGameView(item)"
                  >{{ formatGameView(item) }}</span>
                  <v-btn
                    v-else
                    height="inherit"
                    width="inherit"
                    min-width="inherit"
                    text
                    class="pa-0 text-none v-list-item__subtitle game-button"
                    :title="formatGameView(item)"
                    @click.prevent="$emit('click-category', item.gameId)"
                  >{{ formatGameView(item) }}
                  </v-btn>
                </v-list-item-subtitle>
                <v-list-item-subtitle class="one-line ma-0">
                  <span :title="item.title">{{item.title}}</span>
                </v-list-item-subtitle>
              </template>
              <template v-else>
                <v-list-item-subtitle class="one-line ma-0">
                  {{$t('offline')}}
                </v-list-item-subtitle>
              </template>
            </v-list-item-content>
          </v-list-item>
          <template v-if="false">
            <v-btn
              text
              shaped
              height="auto"
              width="auto"
              min-width="auto"
              class="pa-0 rounded-0"
              @click="expandItem(item)"
            >
              <v-icon>
                {{item.id === itemExpanded ? 'mdi-chevron-right' : 'mdi-chevron-left'}}
              </v-icon>
            </v-btn>
            <div v-if="item.id === itemExpanded" class="d-flex flex-column justify-center px-1">
              <v-icon
                v-if="item.online"
                :color="itemExpandedSelectType === 'STREAM' ? 'primary' : null"
                @click="expandItemContent(item, 'STREAM')"
              >
                mdi-television-play
              </v-icon>
              <v-icon
                :color="itemExpandedSelectType === 'CHAT' ? 'primary' : null"
                @click="expandItemContent(item, 'CHAT')"
              >
                mdi-message-text
              </v-icon>
            </div>
          </template>
        </div>
      </v-hover>
      <div
        v-show="syncedItemExpandedSelect && syncedItemExpandedSelect.id === item.id"
        :key="`S:${item.online}:${item.id}`"
        class="flex-grow-1 relative"
      >
        <template v-if="syncedItemExpandedSelect && syncedItemExpandedSelect.id === item.id">
          <iframe
            :src="`https://player.twitch.tv/?channel=${item.login}&parent=dfebgcjlpoeejpkdphklicngpomckedk.chromiumapp.org`"
            title="teste"
            class="full-absolute"
          />
        </template>
      </div>
      <v-divider
        v-show="idx < (items.length - 1) && !syncedItemExpandedSelect"
        :key="`D:${item.online}:${item.id}`"
        class="my-1"
      />
    </template>
  </v-list>
</template>

<script lang="ts">
import {
  Component,
  Prop,
  PropSync,
  Vue,
} from 'vue-property-decorator';
import StreamersType from '@/types/streamers-type';
import VueI18n from 'vue-i18n';
import moment from 'moment/moment';
import StreamerContentType from '@/types/streamer-content-type';

@Component
export default class StreamersList extends Vue {
  @Prop({ type: Array, required: true })
  readonly items?: StreamersType[];

  @Prop({ type: Date, required: true })
  dumpDate?: Date;

  @Prop({ type: Boolean })
  categoryMode?: boolean;

  @PropSync('itemExpandedSelect', { required: true })
  syncedItemExpandedSelect?: StreamersType | null;

  imgWidth = 90;

  currentTimeInterval?: number | null;

  currentTime = moment();

  itemExpanded: string | null = null;

  itemExpandedSelectType: StreamerContentType | null = null;

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
    this.currentTime = moment();
  }

  formatThumbnailStreamer(streamer: StreamersType): string {
    if (streamer.online) {
      if (!streamer.thumbnailUrl) return '';
      const width = this.imgWidth + 200;
      return `${streamer.thumbnailUrl
        .replace('{width}', width.toFixed())
        .replace('{height}', ((width * 9) / 16).toFixed())}&dump=${this.dumpDate}`;
    }
    if (!streamer.profileImage) return '';
    return streamer.profileImage;
  }

  formatAltImg(streamer: StreamersType): VueI18n.TranslateResult {
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

  getStreamerDuration(streamer: StreamersType): string {
    return moment.duration(this.currentTime.diff(streamer.startedAt))
      .format('hh:mm:ss', { trim: false });
  }

  expandItem(streamer: StreamersType): void {
    this.syncedItemExpandedSelect = null;
    this.itemExpandedSelectType = null;
    this.itemExpanded = streamer.id === this.itemExpanded ? null : streamer.id;
  }

  expandItemContent(streamer: StreamersType, type: StreamerContentType): void {
    this.syncedItemExpandedSelect = this.syncedItemExpandedSelect
    && streamer.id === this.syncedItemExpandedSelect.id
    && type === this.itemExpandedSelectType ? null : streamer;
    this.itemExpandedSelectType = this.syncedItemExpandedSelect ? type : null;
  }

  getListClass(): any {
    return {
      transparent: true,
      'pa-0': true,
      'fill-height': !!this.syncedItemExpandedSelect,
      'd-flex': !!this.syncedItemExpandedSelect,
      'flex-column': !!this.syncedItemExpandedSelect,
    };
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
.game-button {
  letter-spacing: normal !important;
}
</style>
