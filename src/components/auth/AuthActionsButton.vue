<script setup lang="ts">
import type { AccountStore } from '@/store/system/types/systemStoreType'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  listItem?: boolean
  account?: AccountStore
  authenticating?: boolean
  colorAuth?: string
  iconAuth: string
  textAuth: string
  colorClass?: string
}>()
const emit = defineEmits<{
  (e: 'auth', value?: boolean): void
  (e: 'delete', value?: void): void
  (e: 'click', value?: boolean): void
}>()
</script>

<template>
  <template v-if="props.listItem">
    <v-list-item
      v-if="props.account"
      :class="props.colorClass"
      @click="emit('click', false)"
      @keydown.space="emit('click', false)"
      @keydown.enter="emit('click', false)"
      @mousedown.middle.prevent="emit('click', true)"
    >
      <template #prepend>
        <v-avatar :image="props.account.avatarUrl" :icon="!props.account.avatarUrl ? 'mdi-account' : ''" size="small" />
      </template>
      <template #append>
        <v-btn
          variant="text"
          :icon="true"
          size="x-small"
          :aria-label="t('auth.remove')"
          @click.stop="emit('delete')"
          @keydown.space.stop="emit('delete')"
          @keydown.enter.stop="emit('delete')"
        >
          <v-icon size="large">{{ props.account.invalid ? 'mdi-delete' : 'mdi-logout' }}</v-icon>
        </v-btn>
      </template>
      <v-list-item-title class="pr-2">
        <v-icon v-if="props.account.invalid" class="mr-1">mdi-close-circle</v-icon>
        <span>{{ props.account.name }}</span>
      </v-list-item-title>
    </v-list-item>
    <v-list-item v-else :title="props.textAuth" :class="props.colorClass" @click="emit('auth')">
      <template #prepend>
        <v-icon>{{ props.iconAuth }}</v-icon>
      </template>
    </v-list-item>
  </template>
  <template v-else>
    <template v-if="props.account && props.account.invalid">
      <v-btn
        size="small"
        height="28"
        :loading="props.authenticating"
        :disabled="props.authenticating"
        :color="props.colorAuth"
        :aria-label="t('auth.authAccount', { name: props.account.name })"
        class="my-1 rounded-e-0"
        @click="emit('auth')"
      >
        <v-icon size="x-large" class="mr-1">{{ props.iconAuth }}</v-icon>
        <v-icon size="x-large" color="red-lighten-4" class="mr-4">mdi-close-circle</v-icon>
        <v-avatar
          :image="props.account.avatarUrl"
          :icon="!props.account.avatarUrl ? 'mdi-account' : ''"
          size="22"
          class="mr-1"
        />
        <span>{{ props.account.name }}</span>
      </v-btn>
      <v-btn
        variant="tonal"
        size="x-small"
        height="28"
        color="error"
        :icon="true"
        :loading="props.authenticating"
        :disabled="props.authenticating"
        :aria-label="t('auth.removeAccount', { name: props.account.name })"
        class="rounded-s-0 rounded-e"
        @click="emit('delete')"
      >
        <v-icon size="x-large"> mdi-delete </v-icon>
      </v-btn>
    </template>
    <template v-else>
      <v-btn
        size="small"
        :loading="props.authenticating"
        :disabled="props.authenticating"
        :color="props.colorAuth"
        class="my-1"
        @click="emit('auth')"
      >
        <v-icon size="x-large" class="mr-2">{{ props.iconAuth }}</v-icon>
        <span>{{ props.textAuth }}</span>
      </v-btn>
    </template>
  </template>
</template>

<style scoped></style>
