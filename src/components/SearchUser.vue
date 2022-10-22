<template>
  <v-container :class="getContainerClass()">
    <streamers-list
      v-if="filter"
      :items="channels"
      :item-expanded-select.sync="itemExpandedSelect"
      :expanded-mode.sync="expandedMode"
      :dump-date="dumpDate"
      mode="CHANNEL"
      @click="openTwitchLink"
      @click-category="$emit('click-category', $event)"
    />
    <v-row
      v-else
      no-gutters
      role="alert"
      aria-live="polite"
      class="fill-height fill-width absolute-tl"
      align="center"
      justify="center"
    >
      <v-col cols="auto" class="pa-5 text-center">
        <span class="text-h6">
          {{$t('fill_filter_to_search_channels')}}
        </span>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {
  Component,
  InjectReactive,
  Vue,
  Watch,
} from 'vue-property-decorator';
import StreamersList from '@/components/StreamersList.vue';
import ChannelType from '@/types/channel-type';
import StreamersType from '@/types/streamers-type';
import ModeType from '@/types/mode-type';
import UserType from '@/types/user-type';
import { getModule } from 'vuex-module-decorators';
import AppStore from '@/store/modules/app-store';
import { debounce } from 'lodash';
import TwitchApiService from '@/services/twitch-api/twitch-api-service';

@Component({
  components: { StreamersList },
})
export default class SearchUser extends Vue {
  @InjectReactive('user')
  private readonly user?: UserType | null;

  appStore = getModule(AppStore, this.$store);

  channels: ChannelType[] = [];

  itemExpandedSelect: StreamersType | null = null;

  dumpDate?: Date = new Date();

  expandedMode: ModeType = 'NORMAL';

  loading = false;

  loadingChannels = debounce(this.loadChannels, 500);

  get hasUser(): boolean {
    return !!this.user;
  }

  get filter(): string {
    return this.appStore.filterChannelList.trim();
  }

  @Watch('hasUser')
  onHasAuth(): void {
    this.loadingChannels();
  }

  @Watch('filter')
  onFilter(): void {
    this.loadingChannels();
  }

  created(): void {
    this.appStore.setFilterChannelList('');
    this.loadingChannels();
  }

  async loadChannels(): Promise<void> {
    if (!this.filter) {
      this.channels = [];
      return;
    }
    if (this.loading) return;
    try {
      this.loading = true;
      this.appStore.loading();
      this.channels = await TwitchApiService.search.searchChannels(
        this.filter,
        undefined,
        this.appStore.auth?.accessToken,
      );
      this.dumpDate = new Date();
    } catch (e) {
      this.channels = [];
    } finally {
      this.loading = false;
      this.appStore.loaded();
    }
  }

  getContainerClass(): any {
    return {
      'align-start': true,
      'fill-height': !!this.itemExpandedSelect && this.expandedMode !== 'VOD' && this.expandedMode !== 'CLIP',
    };
  }

  openTwitchLink(streamer: StreamersType): void {
    window.open(`https://www.twitch.tv/${streamer.login}`, '_blank');
  }
}
</script>

<style lang="scss" scoped>
</style>
