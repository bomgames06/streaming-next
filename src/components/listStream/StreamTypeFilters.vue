<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import useStreamTypeFilter from '@/composables/useStreamTypeFilter'
import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import { accountTypeColor } from '@/utils/util'
import { mdiCalendarClock, mdiTwitch, mdiYoutube } from '@mdi/js'

const props = defineProps<{
  disabled?: boolean
}>()

const system = useSystemStore()
const { t } = useI18n()
const { hasYoutube, streamTypes, showTypeFilter } = useStreamTypeFilter()

const typeIcons: Record<AccountStoreType, string> = { twitch: mdiTwitch, youtube: mdiYoutube }
</script>

<!-- Columns of the filter rows of the stream lists -->
<template>
  <v-col v-if="hasYoutube" cols="auto">
    <v-btn
      v-tooltip="t('common.upcomings')"
      :aria-checked="system.showUpcomingsComp"
      :aria-label="t('common.upcomings')"
      class="rounded-lg"
      :disabled="props.disabled"
      :icon="true"
      role="checkbox"
      size="24"
      @click="system.showUpcomingsComp = !system.showUpcomingsComp"
    >
      <v-icon :color="system.showUpcomingsComp ? 'primary' : ''" size="18" :icon="mdiCalendarClock" />
    </v-btn>
  </v-col>
  <template v-if="showTypeFilter">
    <v-col class="d-flex" cols="auto">
      <v-divider class="h-75 align-self-center" vertical />
    </v-col>
    <v-col v-for="type in streamTypes" :key="type" cols="auto">
      <v-btn
        v-tooltip="t(`accountTypes.${type}`)"
        :aria-checked="!system.hiddenStreamTypes.includes(type)"
        :aria-label="t(`accountTypes.${type}`)"
        class="rounded-lg"
        :data-testid="`stream-type-${type}`"
        :disabled="props.disabled"
        :icon="true"
        role="checkbox"
        size="24"
        @click="system.toggleHiddenStreamType(type)"
      >
        <v-icon
          :color="system.hiddenStreamTypes.includes(type) ? '' : accountTypeColor(type)"
          size="18"
          :icon="typeIcons[type]"
        />
      </v-btn>
    </v-col>
  </template>
</template>

<style scoped lang="scss"></style>
