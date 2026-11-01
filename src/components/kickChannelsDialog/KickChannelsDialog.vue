<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'
import KickBusiness, { kickSlugOf } from '@/services/business/kickBusiness'
import { kickUrl } from '@/utils/util'
import { browser } from 'wxt/browser'
import { orderBy } from 'lodash'
import toastr from 'toastr'
import { mdiAccount, mdiDelete, mdiPlus } from '@mdi/js'

const { t } = useI18n()

const props = defineProps<{
  // Channels already fetched, for the names and avatars
  streams: StreamItemLiveStreamType[]
}>()
const model = defineModel<boolean>({ default: false })

const system = useSystemStore()

const slug = ref<string>('')
const adding = ref<boolean>(false)

const channels = computed(() =>
  orderBy(
    system.kickChannels.map((value) => ({
      slug: value,
      stream: props.streams.find((stream) => stream.login === value),
    })),
    (value) => (value.stream?.name ?? value.slug).toLowerCase()
  )
)

watch(model, () => {
  slug.value = ''
})

/** The slug is checked on Kick before it is added, it also gets the slug Kick uses (like a typed name in caps) */
async function addChannel() {
  const value = kickSlugOf(slug.value)
  const account = system.accounts.kick
  if (!value || !account || adding.value) return

  if (system.kickChannels.includes(value)) {
    toastr.warning(t('kickChannelsDialog.alreadyAdded'))
    return
  }

  adding.value = true
  try {
    await system.renewAccountToken(account)
    const channel = await KickBusiness.getChannelBySlug(account.token, value)
    if (!channel) {
      toastr.error(t('kickChannelsDialog.notFound', { slug: value }))
      return
    }
    if (!system.addKickChannel(channel.login)) toastr.warning(t('kickChannelsDialog.alreadyAdded'))
    slug.value = ''
  } finally {
    adding.value = false
  }
}

function openChannel(value: string) {
  void browser.tabs.create({ url: kickUrl(value) })
}
</script>

<template>
  <v-dialog v-model="model" eager height="100%" @keydown.esc.prevent="model = false">
    <template #activator="activatorValue">
      <slot name="activator" v-bind="activatorValue" />
    </template>
    <template #default="{ isActive }">
      <v-card :title="t('kickChannelsDialog.title')">
        <v-card-text class="d-flex flex-column overflow-y-auto pb-1">
          <p class="text-body-small text-medium-emphasis">{{ t('kickChannelsDialog.hint') }}</p>
          <v-row density="compact" class="flex-nowrap flex-grow-0">
            <v-col>
              <v-text-field
                v-model="slug"
                :label="t('kickChannelsDialog.slug')"
                variant="outlined"
                density="compact"
                autofocus
                class="mt-2"
                data-testid="kick-channels-slug"
                :disabled="adding"
                @keydown.enter.prevent="addChannel"
              />
            </v-col>
            <v-col cols="auto">
              <div class="pt-2 h-100">
                <v-btn
                  :aria-label="t('common.add')"
                  :disabled="!slug.trim()"
                  :loading="adding"
                  height="100%"
                  min-width="0"
                  class="px-2"
                  data-testid="kick-channels-add"
                  @click="addChannel"
                >
                  <v-icon :icon="mdiPlus" />
                </v-btn>
              </div>
            </v-col>
          </v-row>
          <div class="flex-grow-1 overflow-y-auto mt-2">
            <v-list v-if="channels.length" density="compact" class="py-0">
              <v-list-item
                v-for="channel in channels"
                :key="channel.slug"
                :title="channel.stream?.name ?? channel.slug"
                :subtitle="channel.slug"
                @click="openChannel(channel.slug)"
              >
                <template #prepend>
                  <v-avatar
                    size="small"
                    :icon="!channel.stream?.profileImage ? mdiAccount : undefined"
                    :image="channel.stream?.profileImage"
                  />
                </template>
                <template #append>
                  <v-btn
                    :aria-label="t('auth.removeAccount', { name: channel.stream?.name ?? channel.slug })"
                    icon
                    size="x-small"
                    variant="flat"
                    :data-testid="`kick-channels-remove-${channel.slug}`"
                    @click.stop="system.removeKickChannel(channel.slug)"
                  >
                    <v-icon size="large" color="error" :icon="mdiDelete" />
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <v-sheet v-else class="d-flex align-center justify-center h-100">
              {{ t('kickChannelsDialog.noChannels') }}
            </v-sheet>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :text="t('common.close')" @click="isActive.value = false" />
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<style scoped lang="scss"></style>
