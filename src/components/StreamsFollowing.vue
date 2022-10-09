<template>
  <v-container :class="getContainerClass()">
    <streamers-list
      :items="streamersOrder"
      :item-expanded-select.sync="itemExpandedSelect"
      :dump-date="dumpDate"
      @click="openTwitchLink"
      @click-category="$emit('click-category', $event)"
    />
    <v-btn
      v-if="!itemExpandedSelect && streamersOffline.length && isEnabledFilterOnline"
      block
      height="54"
      class="mt-2"
      @click="showOfflines = !showOfflines"
    >
      <v-icon class="mr-2">
        mdi-wifi-off
      </v-icon>
      <span>{{$t(showOfflines ? 'hide_offlines' : 'show_offlines')}}</span>
    </v-btn>
  </v-container>
</template>

<script lang="ts">
import {
  Component,
  InjectReactive,
  Watch,
  Vue,
} from 'vue-property-decorator';
import StreamersType from '@/types/streamers-type';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import UserType from '@/types/user-type';
import TwitchApiService from '@/services/twitch-api/twitch-api-service';
import { deburr, orderBy } from 'lodash';
import StreamersList from '@/components/StreamersList.vue';

@Component({
  components: { StreamersList },
})
export default class StreamsFollowing extends Vue {
  @InjectReactive('user')
  private readonly user?: UserType | null;

  appStore = getModule(AppStore, this.$store);

  streamersOnline: StreamersType[] = [];

  streamersOffline: StreamersType[] = [];

  loading = false;

  timeoutLoad?: number | null;

  showOfflines = false;

  itemExpandedSelect: StreamersType | null = null;

  dumpDate?: Date = new Date();

  get hasUser(): boolean {
    return !!this.user;
  }

  get streamersOrder(): StreamersType[] {
    return orderBy(
      [
        ...this.streamersOnline,
        ...this.showOfflines || !this.isEnabledFilterOnline ? this.streamersOffline : [],
      ].filter((value) => deburr(value.nickname || value.login).toLowerCase()
        .includes(deburr(this.appStore.filterList.trim().toLowerCase()))),
      [
        (value) => this.isEnabledFilterOnline && !value.online,
        this.getTextFilterStreamers,
      ],
      ['asc', this.appStore.filterOrderAsc ? 'asc' : 'desc'],
    );
  }

  get isEnabledFilterOnline(): boolean {
    return (!this.appStore.filterList.trim() || ['VIEW', 'GAME'].includes(this.appStore.filterOrderList));
  }

  @Watch('hasUser')
  onHasAuth(): void {
    this.loadStreamers();
  }

  created(): void {
    this.loadStreamers();
  }

  beforeDestroy(): void {
    if (this.timeoutLoad) {
      clearTimeout(this.timeoutLoad);
      this.timeoutLoad = null;
    }
  }

  getTextFilterStreamers(item: StreamersType): any {
    switch (this.appStore.filterOrderList) {
      case 'NAME':
        return deburr(item.nickname || item.login).toLowerCase();
      case 'VIEW':
        return item.viewers;
      case 'GAME':
        return deburr(item.gameName || '').toLowerCase();
      default:
        return '';
    }
  }

  async loadStreamers(force?: boolean): Promise<void> {
    if (!this.user) {
      this.streamersOnline = [];
      this.streamersOffline = [];
      return;
    }
    if (this.loading) return;
    if (this.timeoutLoad) {
      clearTimeout(this.timeoutLoad);
      this.timeoutLoad = null;
    }
    try {
      this.loading = true;
      this.appStore.loading();
      this.streamersOnline = await TwitchApiService.streamers.getStreamersOnlineFollowed(
        this.user.id,
        this.appStore.auth?.accessToken,
      );
      if (force) {
        this.dumpDate = new Date();
      }
      this.streamersOffline = await TwitchApiService.streamers.getStreamersOfflineFollowed(
        this.user.id,
        this.streamersOnline.map((value) => value.id),
        this.appStore.auth?.accessToken,
      );
    } catch (e) {
      this.streamersOnline = [];
      this.streamersOffline = [];
    } finally {
      this.loading = false;
      this.appStore.loaded();
      this.timeoutLoad = setTimeout(this.loadStreamers, 60000);
    }
  }

  openTwitchLink(streamer: StreamersType): void {
    window.open(`https://www.twitch.tv/${streamer.login}`, '_blank');
  }

  getContainerClass(): any {
    return {
      'align-start': true,
      'fill-height': !!this.itemExpandedSelect,
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
</style>
