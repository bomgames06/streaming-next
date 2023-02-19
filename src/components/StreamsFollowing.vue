<template>
  <v-container :class="getContainerClass()">
    <streamers-list
      :items="streamersOrder"
      :item-expanded-select.sync="itemExpandedSelect"
      :expanded-mode.sync="expandedMode"
      :dump-date="dumpDate"
      mode="STREAM"
      @click="openTwitchLink"
      @click-category="$emit('click-category', $event)"
    />
    <v-btn
      v-if="!itemExpandedSelect && streamersOffline.length && isEnabledFilterOnline
      && !appStore.showAlwaysOfflines"
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
import ModeType from '@/types/mode-type';

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

  expandedMode: ModeType = 'NORMAL';

  get hasUser(): boolean {
    return !!this.user;
  }

  get streamersOrder(): StreamersType[] {
    return orderBy(
      [
        ...this.streamersOnline,
        ...(this.showOfflines || this.appStore.showAlwaysOfflines)
        || !this.isEnabledFilterOnline ? this.streamersOffline : [],
      ].filter((value) => this.itemExpandedSelect
        || deburr(value.nickname || value.login).toLowerCase()
          .includes(deburr(this.appStore.filterList.trim().toLowerCase()))),
      [
        (value) => !value.online,
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

  getBrowserAction(): any {
    if (browser.browserAction) {
      return browser.browserAction;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return browser.action;
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
      this.getBrowserAction().setBadgeBackgroundColor({
        color: '#660099',
      }).then();
      await browser.runtime.sendMessage({ type: 'BADGE_COUNT', value: this.streamersOnline.length });
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

  openTwitchLink(streamer: any): void {
    browser.tabs.create({ url: `https://www.twitch.tv/${streamer.value.login}`, active: !streamer.middle });
  }

  getContainerClass(): any {
    return {
      'align-start': true,
      'fill-height': !!this.itemExpandedSelect && this.expandedMode !== 'VOD' && this.expandedMode !== 'CLIP',
    };
  }

  refresh(): void {
    if (!this.itemExpandedSelect) {
      this.loadStreamers(true);
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
