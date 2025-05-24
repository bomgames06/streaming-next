<script setup lang="ts">
import type { StreamItemLiveType } from '@/components/listStream/types/streamItemType'
import useSystemStore from '@/store/system/useSystemStore'
import { useI18n } from 'vue-i18n'
import AppBusiness from '@/services/business/appBusiness'
import { debounce, orderBy } from 'lodash'
import { mdiMagnify } from '@mdi/js'

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
    response.items = orderBy(response.items, ['name'])

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
      <StreamList disable-notification-menu disable-view-count :items="channels.items" />
      <v-btn
        v-if="channels.cursor"
        block
        class="mt-2"
        :disabled="fetching"
        height="54"
        :loading="fetching"
        @click="fetchChannels()"
      >
        <v-icon class="mr-2" size="x-large" :icon="mdiMagnify" />
        <span>{{ t('searchView.searchMore') }}</span>
      </v-btn>
    </template>
    <v-row v-else align="center" class="h-100" justify="center">
      <v-col cols="auto">
        <p class="text-center text-h6">
          {{ t('searchView.fillFieldToSearchChannels') }}
        </p>
      </v-col>
    </v-row>
  </ViewContainer>
</template>

<style scoped></style>
