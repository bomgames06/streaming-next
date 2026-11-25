<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import useStreamTypeFilter from '@/composables/useStreamTypeFilter'
import type { AccountStoreType } from '@/store/system/types/systemStoreType'
import { accountTypeColor } from '@/utils/util'
import { mdiCalendarClock, mdiLayers, mdiLayersOutline, mdiTwitch, mdiYoutube } from '@mdi/js'
import { mdiKick } from '@/utils/icons'

const props = defineProps<{
  disabled?: boolean
}>()

const system = useSystemStore()
const { t } = useI18n()
const { hasYoutube, streamTypes, showTypeFilter } = useStreamTypeFilter()

const typeIcons: Record<AccountStoreType, string> = { twitch: mdiTwitch, youtube: mdiYoutube, kick: mdiKick }
// Highlighted while some platform is hidden, like the other filters when they are on
const hidingType = computed(() => streamTypes.value.some((type) => system.hiddenStreamTypes.includes(type)))
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
  <v-col v-if="showTypeFilter" cols="auto">
    <!-- The platforms share one button, each one more on the filter row would not fit -->
    <v-menu :close-on-content-click="false">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-tooltip="t('common.platforms')"
          v-bind="menuProps"
          :aria-label="t('common.platforms')"
          class="rounded-lg"
          data-testid="stream-types"
          :disabled="props.disabled"
          :icon="true"
          size="24"
        >
          <v-icon :color="hidingType ? 'primary' : ''" size="18" :icon="hidingType ? mdiLayers : mdiLayersOutline" />
        </v-btn>
      </template>
      <template #default="{ isActive }">
        <v-list class="pa-0" density="compact" @keydown.esc.prevent="isActive.value = false">
          <v-list-item
            v-for="type in streamTypes"
            :key="type"
            :aria-checked="!system.hiddenStreamTypes.includes(type)"
            :data-testid="`stream-type-${type}`"
            role="checkbox"
            :title="t(`accountTypes.${type}`)"
            @click="system.toggleHiddenStreamType(type)"
          >
            <template #prepend>
              <v-icon
                :color="system.hiddenStreamTypes.includes(type) ? '' : accountTypeColor(type)"
                :icon="typeIcons[type]"
              />
            </template>
            <template #append>
              <v-checkbox-btn
                :model-value="!system.hiddenStreamTypes.includes(type)"
                density="compact"
                tabindex="-1"
                @click.stop="system.toggleHiddenStreamType(type)"
              />
            </template>
          </v-list-item>
        </v-list>
      </template>
    </v-menu>
  </v-col>
</template>

<style scoped lang="scss"></style>
