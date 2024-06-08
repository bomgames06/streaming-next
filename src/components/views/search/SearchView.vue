<script setup lang="ts">
import type { StreamItemLiveType } from '@/components/listStream/types/streamItemType'
import { reactive, ref, watch } from 'vue'
import StreamList from '@/components/listStream/StreamList.vue'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import AppBusiness from '@/services/business/appBusiness'
import { debounce } from 'lodash'
import ViewContainer from '@/components/viewContainer/ViewContainer.vue'

const system = useSystemStore()
const { t } = useI18n()

system.streamNameFilterComp = ''

watch(
  () => system.accounts.twitch,
  () => {
    if (!system.accounts.twitch) system.setView('streams')
  },
  { immediate: true }
)

const channels = reactive<{
  items: StreamItemLiveType[]
  cursor?: string
}>({
  items: [],
})

const fetching = ref(false)
async function fetchChannels() {
  if (!system.streamNameFilter) {
    channels.items = []
    channels.cursor = undefined
    return
  }
  system.loading()
  fetching.value = true
  try {
    const account = system.accounts.twitch
    if (!account) return

    const response = await AppBusiness.searchChannels(account, system.streamNameFilter, channels.cursor, 100)

    if (channels.cursor) channels.items.push(...response.items)
    else channels.items = response.items
    channels.cursor = response.cursor
  } finally {
    system.loaded()
    fetching.value = false
  }
}
const fetchChannelsDebounce = debounce(fetchChannels, 500)

watch(
  () => system.streamNameFilter,
  () => {
    channels.cursor = undefined
    fetchChannelsDebounce()
  }
)
</script>

<template>
  <ViewContainer>
    <template v-if="system.streamNameFilter">
      <StreamList :items="channels.items" disable-favorite-menu />
      <v-btn
        v-if="channels.cursor"
        :disabled="fetching"
        :loading="fetching"
        height="54"
        block
        class="mt-2"
        @click="fetchChannels()"
      >
        <v-icon size="x-large" class="mr-2">mdi-magnify</v-icon>
        <span>{{ t('searchView.searchMore') }}</span>
      </v-btn>
    </template>
    <v-row v-else align="center" justify="center" class="h-100">
      <v-col cols="auto">
        <p class="text-center text-h6">
          {{ t('searchView.fillFieldToSearchChannels') }}
        </p>
      </v-col>
    </v-row>
  </ViewContainer>
</template>

<style scoped></style>
