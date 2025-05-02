<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { GroupStreamStore } from '@/store/system/types/systemStoreType.ts'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType.ts'
import { type VListItem } from 'vuetify/components'

const { t } = useI18n()

const props = defineProps<{
  group: GroupStreamStore
  listItemProps?: InstanceType<typeof VListItem>['$props']
  streamItem?: StreamItemLiveStreamType
  hideEdit?: boolean
}>()
const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'edit'): void
  (e: 'click'): void
  (e: 'toggleStream', value: boolean): void
}>()

const selected = computed(
  () =>
    props.streamItem &&
    props.group.streams.some((value) => value.type === props.streamItem!.type && value.id === props.streamItem!.id)
)

function itemClick() {
  if (!props.streamItem) emit('click')
  else emit('toggleStream', !selected.value)
}
</script>

<template>
  <v-list-item
    v-bind="props.listItemProps"
    :title="props.group.name"
    :subtitle="
      t(
        'groupStreamDialog.streamCount',
        {
          count: props.group.streams.length,
        },
        props.group.streams.length
      )
    "
    :aria-selected="props.streamItem ? selected : undefined"
    lines="two"
    density="compact"
    class="group-stream-list-item"
    @click="itemClick"
  >
    <template #prepend>
      <v-btn v-if="!props.hideEdit" icon size="x-small" variant="flat" class="mr-2" @click.stop="emit('edit')">
        <v-icon size="large">mdi-pencil</v-icon>
        <slot name="edit" />
      </v-btn>
    </template>
    <template #append>
      <v-icon v-if="props.streamItem">
        {{ selected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
      </v-icon>
      <v-btn v-else icon size="x-small" variant="flat" @click.stop="emit('delete')">
        <v-icon size="large" color="error">mdi-delete</v-icon>
      </v-btn>
    </template>
  </v-list-item>
</template>

<style scoped lang="scss">
.group-stream-list-item {
  ::v-deep(.v-list-item__prepend) {
    align-self: stretch;
  }
}
</style>
