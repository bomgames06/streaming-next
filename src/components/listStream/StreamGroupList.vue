<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StreamItemLiveStreamType, StreamItemType } from '@/components/listStream/types/streamItemType.ts'
import useSystemStore from '@/store/system/useSystemStore.ts'
import { orderBy } from 'lodash'
import type { GroupStreamStore } from '@/store/system/types/systemStoreType.ts'

const { t } = useI18n()

const props = defineProps<{
  items: StreamItemType[]
  disableContextMenu?: boolean
  disableCategoryMenu?: boolean
  disableNotificationMenu?: boolean
  disableViewCount?: boolean
  dump?: string
  parent?: StreamItemType
  streams?: StreamItemLiveStreamType[]
}>()

const system = useSystemStore()

const detailItem = defineModel<StreamItemType>('detailItem')
const groupDetailitem = ref<GroupStreamStore>()

const groupStreamItems = computed(() => orderBy(system.groupStreams, ['name'], ['asc']))
const streamsWithoutGroup = computed(() =>
  props.items.filter(
    (item) =>
      !system.groupStreams.some((groupStream) =>
        groupStream.streams.some((stream) => stream.type === item.type && stream.id === item.id)
      )
  )
)

function getItemsByGroup(groupStream: GroupStreamStore): StreamItemType[] {
  return props.items.filter((item) =>
    groupStream.streams.some((stream) => stream.type === item.type && stream.id === item.id)
  )
}

function setDetailitem(detailItemValue?: StreamItemType, group?: GroupStreamStore) {
  detailItem.value = detailItemValue
  groupDetailitem.value = detailItemValue ? group : undefined
}
</script>

<template>
  <div>
    <v-row v-if="!detailItem" dense class="flex-nowrap">
      <v-col>
        <GroupStreamDialog :streams="props.streams || []">
          <template #activator="{ props: groupStreamDialogProps }">
            <v-btn v-bind="groupStreamDialogProps" block class="mb-2">
              {{ t('streamGroupList.manageGroup') }}
            </v-btn>
          </template>
        </GroupStreamDialog>
      </v-col>
      <v-col cols="auto">
        <v-btn
          :aria-label="t('streamGroupList.showNoGroup')"
          min-width="0"
          class="px-2"
          @click="system.setShowNoGroup(!system.showNoGroup)"
        >
          <v-icon
            :icon="system.showNoGroup ? 'mdi-folder-off' : 'mdi-folder-off-outline'"
            :color="system.showNoGroup ? 'primary' : undefined"
          />
        </v-btn>
      </v-col>
    </v-row>
    <v-expansion-panels variant="accordion" static multiple elevation="0" ripple bg-color="background">
      <v-expansion-panel
        v-for="groupStream in groupStreamItems"
        v-show="!detailItem || groupStream.id === groupDetailitem?.id"
        :key="groupStream.id"
        :class="{
          'expansion-group-item': true,
          'detail-item': !!detailItem,
        }"
      >
        <v-expansion-panel-title v-if="!detailItem">
          {{ groupStream.name }}
        </v-expansion-panel-title>
        <v-expansion-panel-text color="background">
          <StreamList
            :detail-item="detailItem"
            :dump="props.dump"
            :items="getItemsByGroup(groupStream)"
            :streams="props.streams"
            @update:detail-item="setDetailitem($event, groupStream)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel
        v-if="system.showNoGroup && streamsWithoutGroup.length"
        v-show="!detailItem || !groupDetailitem"
        :class="{
          'expansion-group-item': true,
          'detail-item': !!detailItem,
        }"
      >
        <v-expansion-panel-title v-if="!detailItem">
          {{ t('streamGroupList.noGroup') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text color="background">
          <StreamList
            v-model:detail-item="detailItem"
            :dump="props.dump"
            :items="streamsWithoutGroup"
            :streams="props.streams"
            @update:detail-item="setDetailitem($event)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<style scoped lang="scss">
.expansion-group-item {
  ::v-deep(.v-expansion-panel-text__wrapper) {
    padding-left: 0;
    padding-right: 0;
  }
}
.expansion-group-item.detail-item {
  ::v-deep(.v-expansion-panel-text__wrapper) {
    padding-top: 0;
    padding-bottom: 0;
  }
}
.detail-item::after {
  opacity: 0 !important;
}
</style>
