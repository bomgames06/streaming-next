<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CategoryNotificationStore } from '@/store/system/types/systemStoreType'
import type { VListItem } from 'vuetify/components'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'

const { t } = useI18n()

const props = defineProps<{
  category: CategoryNotificationStore
  listItemProps?: InstanceType<typeof VListItem>['$props']
  streamItem?: StreamItemLiveStreamType
}>()
const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'toggleStream', value: boolean): void
}>()

const imageRatio = 52 / 72

const selected = computed(
  () =>
    props.streamItem &&
    props.category.streams.some((value) => value.type === props.streamItem!.type && value.id === props.streamItem!.id)
)

function itemClick() {
  if (!props.streamItem) return

  emit('toggleStream', !selected.value)
}
</script>

<template>
  <v-list-item
    v-bind="props.listItemProps"
    :title="props.category.name"
    :subtitle="
      t(
        'categoryNotificationDialog.streamCount',
        {
          count: props.category.streams.length,
        },
        props.category.streams.length
      )
    "
    :aria-selected="props.streamItem ? selected : undefined"
    lines="two"
    density="compact"
    class="category-notification-list-item"
    @click="itemClick"
  >
    <template #prepend>
      <div class="mr-2 h-100">
        <v-img v-if="props.category.imageUrl" :src="props.category.imageUrl" :aspect-ratio="imageRatio" width="30" />
        <v-sheet v-else color="surface-light" style="width: 30px" class="d-flex align-center justify-center h-100">
          <v-icon>mdi-camera-off</v-icon>
        </v-sheet>
      </div>
    </template>
    <template #append>
      <v-icon v-if="props.streamItem">
        {{ selected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
      </v-icon>
      <v-btn v-else icon size="x-small" variant="flat" @click="emit('delete')">
        <v-icon size="large" color="error">mdi-delete</v-icon>
      </v-btn>
    </template>
  </v-list-item>
</template>

<style scoped lang="scss">
.category-notification-list-item {
  ::v-deep(.v-list-item__prepend) {
    align-self: stretch;
  }
}
</style>
