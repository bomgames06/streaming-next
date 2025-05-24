<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StreamItemLiveStreamType, StreamItemType } from '@/components/listStream/types/streamItemType.ts'
import useSystemStore from '@/store/system/useSystemStore.ts'
import { orderBy } from 'lodash'
import type { GroupStreamStore } from '@/store/system/types/systemStoreType.ts'
import { mdiArrowCollapse, mdiArrowExpand, mdiFolderOff, mdiFolderOffOutline } from '@mdi/js'

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
  firstLoading?: boolean
}>()

const system = useSystemStore()

const noGroupId: string = 'noGroup'

const detailItem = defineModel<StreamItemType>('detailItem')
const groupDetailitem = ref<GroupStreamStore>()

const groupStreamItems = computed<GroupStreamStore[]>(() => orderBy(system.groupStreams, ['name'], ['asc']))
const streamsWithoutGroup = computed<StreamItemType[]>(() =>
  props.items.filter(
    (item) =>
      !system.groupStreams.some((groupStream) =>
        groupStream.streams.some((stream) => stream.type === item.type && stream.id === item.id)
      )
  )
)
const groupIds = computed<string[]>(() => {
  const values: string[] = []

  values.push(...groupStreamItems.value.map((groupStream) => groupStream.id))
  if (system.showNoGroup) values.push(noGroupId)

  return values
})

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
  <div class="d-flex flex-column h-100">
    <v-row v-if="!detailItem" dense class="flex-nowrap flex-grow-0">
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
          v-tooltip="t('streamGroupList.expandAll')"
          :aria-label="t('streamGroupList.expandAll')"
          min-width="0"
          class="px-2"
          @click="system.groupExpandedComp = groupIds"
        >
          <v-icon :icon="mdiArrowExpand" />
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn
          v-tooltip="t('streamGroupList.collapseAll')"
          :aria-label="t('streamGroupList.collapseAll')"
          min-width="0"
          class="px-2"
          @click="system.groupExpandedComp = []"
        >
          <v-icon :icon="mdiArrowCollapse" />
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn
          v-tooltip="t('streamGroupList.showNoGroup')"
          :aria-label="t('streamGroupList.showNoGroup')"
          min-width="0"
          class="px-2"
          @click="system.setShowNoGroup(!system.showNoGroup)"
        >
          <v-icon
            :icon="system.showNoGroup ? mdiFolderOff : mdiFolderOffOutline"
            :color="system.showNoGroup ? 'primary' : undefined"
          />
        </v-btn>
      </v-col>
    </v-row>
    <v-expansion-panels
      v-if="groupStreamItems.length || system.showNoGroup"
      v-model="system.groupExpandedComp"
      variant="accordion"
      static
      multiple
      elevation="0"
      ripple
      bg-color="background"
    >
      <v-expansion-panel
        v-for="groupStream in groupStreamItems"
        v-show="!detailItem || groupStream.id === groupDetailitem?.id"
        :key="groupStream.id"
        :value="groupStream.id"
        :class="{
          'expansion-group-item': true,
          'detail-item': !!detailItem,
        }"
      >
        <v-expansion-panel-title v-if="!detailItem">
          {{ groupStream.name }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <StreamList
            :detail-item="detailItem"
            :dump="props.dump"
            :items="getItemsByGroup(groupStream)"
            :streams="props.streams"
            :loading="props.firstLoading"
            @update:detail-item="setDetailitem($event, groupStream)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel
        v-if="system.showNoGroup"
        v-show="!detailItem || !groupDetailitem"
        :value="noGroupId"
        :class="{
          'expansion-group-item': true,
          'detail-item': !!detailItem,
        }"
      >
        <v-expansion-panel-title v-if="!detailItem">
          {{ t('streamGroupList.noGroup') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <StreamList
            v-model:detail-item="detailItem"
            :dump="props.dump"
            :items="streamsWithoutGroup"
            :streams="props.streams"
            :loading="props.firstLoading"
            @update:detail-item="setDetailitem($event)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-row v-else dense align="center" justify="center">
      <v-col cols="auto" class="text-center">
        {{ t('streamGroupList.noGroupAdded') }}
      </v-col>
    </v-row>
  </div>
</template>

<style scoped lang="scss">
.expansion-group-item {
  ::v-deep(.v-expansion-panel-text__wrapper) {
    padding-left: 0;
    padding-right: 0;
  }
  ::v-deep(.v-expansion-panel-title--active) {
    color: rgb(var(--v-theme-primary));
  }
}
.detail-item::after {
  opacity: 0 !important;
}
</style>
