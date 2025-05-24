<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore.ts'
import type { GroupStreamStore } from '@/store/system/types/systemStoreType.ts'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType.ts'
import { compact, orderBy } from 'lodash'
import { mdiClose, mdiDelete, mdiPlus } from '@mdi/js'

const { t } = useI18n()

const props = defineProps<{
  streams: StreamItemLiveStreamType[]
  streamItem?: StreamItemLiveStreamType
}>()
const model = defineModel<boolean>({ default: false })

const system = useSystemStore()

const group = ref<string>('')
const expandGroup = ref<GroupStreamStore>()
const groupAddStream = ref<GroupStreamStore>()
const stream = ref<StreamItemLiveStreamType>()

const groupStreamsItems = computed(() => orderBy(system.groupStreams, 'name'))
const streams = computed(() => orderBy(props.streams, 'name'))
const streamGroupStreams = computed(() => {
  if (!props.streamItem) return []
  return groupStreamsItems.value
})

watch(model, () => {
  group.value = ''
  groupAddStream.value = undefined
  stream.value = undefined
  expandGroup.value = undefined
})

function addGroup() {
  if (!group.value) return

  const id = system.addGroupStream(group.value)

  group.value = ''

  if (!props.streamItem) return

  system.addStreamToGroupStream(id, props.streamItem.type, props.streamItem.id)
}

async function openAddStream(groupStream: GroupStreamStore) {
  groupAddStream.value = groupStream
  stream.value = undefined
  await nextTick()

  document.getElementById(`autocomplete-${groupStream.id}`)?.focus()
}

function addStream(group: GroupStreamStore, streamItem?: StreamItemLiveStreamType) {
  if (!streamItem) return

  system.addStreamToGroupStream(group.id, streamItem.type, streamItem.id)

  void closeAddStream()
  stream.value = undefined
}

async function closeAddStream() {
  if (!groupAddStream.value) return

  const id = groupAddStream.value.id

  groupAddStream.value = undefined

  await nextTick()

  document.getElementById(`list-item-add-${id}`)?.focus()
}

function getStreamListFromGroup(group: GroupStreamStore): StreamItemLiveStreamType[] {
  return compact(
    group.streams.map((itemStreamGroup) =>
      props.streams.find(
        (itemStream) => itemStream.type === itemStreamGroup.type && itemStream.id === itemStreamGroup.id
      )
    )
  )
}

function deleteGroup(groupItem: GroupStreamStore) {
  system.removeGroupStream(groupItem.id)
  expandGroup.value = undefined
}
function editGroupName(groupItem: GroupStreamStore, value: string) {
  system.editGroupStream(groupItem.id, { name: value })
}
function clickGroup(groupItem: GroupStreamStore) {
  expandGroup.value = !expandGroup.value || expandGroup.value.id !== groupItem.id ? groupItem : undefined
}
</script>

<template>
  <v-dialog v-model="model" eager height="100%" @keydown.esc.prevent="model = false">
    <template #activator="activatorValue">
      <slot name="activator" v-bind="activatorValue" />
    </template>
    <template #default="{ isActive }">
      <v-card :title="t('groupStreamDialog.title')">
        <v-card-text class="d-flex flex-column overflow-y-auto pb-1">
          <v-row v-if="props.streamItem" dense class="flex-nowrap flex-grow-0">
            <v-col cols="12">
              <v-avatar :image="props.streamItem.profileImage" class="mr-2" />
              <span>{{ props.streamItem.name }}</span>
            </v-col>
          </v-row>
          <v-row dense class="flex-nowrap flex-grow-0">
            <v-col>
              <v-text-field
                v-model.trim="group"
                :label="t('groupStreamDialog.group')"
                variant="outlined"
                density="compact"
                autofocus
                class="mt-2"
                @keydown.enter.prevent="addGroup"
              />
            </v-col>
            <v-col cols="auto">
              <div class="pt-2 h-100">
                <v-btn
                  :aria-label="t('common.add')"
                  :disabled="!group"
                  height="100%"
                  min-width="0"
                  class="px-2"
                  @click="addGroup"
                >
                  <v-icon :icon="mdiPlus" />
                </v-btn>
              </div>
            </v-col>
          </v-row>
          <div class="flex-grow-1 overflow-y-auto mt-2">
            <template v-if="system.groupStreams.length">
              <v-list v-if="props.streamItem" dense class="py-0">
                <GroupStreamListItem
                  v-for="groupStream in streamGroupStreams"
                  :key="groupStream.id"
                  :group="groupStream"
                  :stream-item="props.streamItem"
                  hide-edit
                  @toggle-stream="
                    $event
                      ? system.addStreamToGroupStream(groupStream.id, props.streamItem.type, props.streamItem.id)
                      : system.removeStreamFromGroupStream(groupStream.id, props.streamItem.type, props.streamItem.id)
                  "
                />
              </v-list>
              <v-list v-else dense class="py-0">
                <v-tooltip
                  v-for="groupStream in groupStreamsItems"
                  :key="groupStream.id"
                  :text="t('common.back')"
                  location="bottom"
                  :disabled="!expandGroup"
                >
                  <template #activator="{ props: tooltipProps }">
                    <GroupStreamListItem
                      v-show="!expandGroup || expandGroup.id === groupStream.id"
                      :list-item-props="tooltipProps"
                      :group="groupStream"
                      @delete="deleteGroup(groupStream)"
                      @click="clickGroup(groupStream)"
                    >
                      <template #edit>
                        <v-dialog activator="parent" @keydown.esc.prevent>
                          <template #default="{ isActive: editDialogIsActive }">
                            <v-confirm-edit
                              :model-value="groupStream.name"
                              :disabled="[]"
                              @update:model-value="editGroupName(groupStream, $event)"
                              @cancel="editDialogIsActive.value = false"
                              @save="editDialogIsActive.value = false"
                            >
                              <template #default="{ model: proxyModel, actions, save }">
                                <v-card class="mx-auto" width="100%" :title="t('common.edit')">
                                  <template #text>
                                    <v-text-field
                                      v-model="proxyModel.value"
                                      :label="t('common.value')"
                                      autofocus
                                      @keydown.enter.prevent="save"
                                    />
                                  </template>
                                  <template #actions>
                                    <v-spacer />
                                    <component :is="actions" />
                                  </template>
                                </v-card>
                              </template>
                            </v-confirm-edit>
                          </template>
                        </v-dialog>
                      </template>
                    </GroupStreamListItem>
                  </template>
                </v-tooltip>
              </v-list>
            </template>
            <v-sheet v-else class="d-flex align-center justify-center h-100">
              {{ t('groupStreamDialog.noGroups') }}
            </v-sheet>
            <template v-if="expandGroup">
              <v-divider />
              <v-list dense class="py-0">
                <v-list-item
                  v-if="groupAddStream?.id !== expandGroup.id"
                  :id="`list-item-add-${expandGroup.id}`"
                  :title="t('groupStreamDialog.addStream')"
                  :prepend-icon="mdiPlus"
                  class="px-2"
                  @click="openAddStream(expandGroup)"
                />
                <v-list-item v-else>
                  <v-row dense class="flex-nowrap">
                    <v-col>
                      <v-autocomplete
                        :id="`autocomplete-${expandGroup.id}`"
                        v-model="stream"
                        :items="streams"
                        :item-value="(item) => `${item.type}:${item.id}`"
                        item-title="name"
                        :label="t('groupStreamDialog.stream')"
                        density="compact"
                        variant="outlined"
                        return-object
                        class="my-2"
                        @keydown.enter.prevent="addStream(groupAddStream, stream)"
                      >
                        <template #item="{ item, props: itemAutocompleteProps }">
                          <v-list-item v-bind="itemAutocompleteProps">
                            <template #prepend>
                              <v-avatar size="small" :image="item.raw.profileImage" />
                            </template>
                          </v-list-item>
                        </template>
                      </v-autocomplete>
                    </v-col>
                    <v-col cols="auto">
                      <div class="py-2 h-100">
                        <v-btn
                          :aria-label="t('common.add')"
                          :disabled="!stream"
                          height="100%"
                          min-width="0"
                          class="px-2"
                          @click="addStream(groupAddStream, stream)"
                        >
                          <v-icon :icon="mdiPlus" />
                        </v-btn>
                      </div>
                    </v-col>
                    <v-col cols="auto">
                      <div class="py-2 h-100">
                        <v-btn
                          :aria-label="t('common.close')"
                          height="100%"
                          min-width="0"
                          class="px-2"
                          @click="closeAddStream"
                        >
                          <v-icon :icon="mdiClose" />
                        </v-btn>
                      </div>
                    </v-col>
                  </v-row>
                </v-list-item>
                <v-list-item
                  v-for="groupStreamStream in getStreamListFromGroup(expandGroup)"
                  :key="groupStreamStream.id"
                  dense
                  :title="groupStreamStream.name"
                  class="stream-group-content"
                >
                  <template #prepend>
                    <v-avatar size="small" :image="groupStreamStream.profileImage" />
                  </template>
                  <template #append>
                    <v-btn
                      icon
                      size="x-small"
                      variant="flat"
                      @click="
                        system.removeStreamFromGroupStream(expandGroup.id, groupStreamStream.type, groupStreamStream.id)
                      "
                    >
                      <v-icon size="large" color="error" :icon="mdiDelete" />
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </template>
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
