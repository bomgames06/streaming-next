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
      @keydown.enter="emit('click', false)"
      @keydown.space="emit('click', false)"
      @mousedown.middle.prevent="emit('click', true)"
    >
      <template #prepend>
        <v-avatar :icon="!props.account.avatarUrl ? 'mdi-account' : ''" :image="props.account.avatarUrl" size="small" />
      </template>
      <template #append>
        <v-btn
          :aria-label="t('auth.remove')"
          :icon="true"
          size="x-small"
          variant="text"
          @click.stop="emit('delete')"
          @keydown.enter.stop="emit('delete')"
          @keydown.space.stop="emit('delete')"
        >
          <v-icon size="large">{{ props.account.invalid ? 'mdi-delete' : 'mdi-logout' }}</v-icon>
        </v-btn>
      </template>
      <v-list-item-title class="pr-2">
        <v-icon v-if="props.account.invalid" class="mr-1">mdi-close-circle</v-icon>
        <span>{{ props.account.name }}</span>
      </v-list-item-title>
    </v-list-item>
    <v-list-item v-else :class="props.colorClass" :title="props.textAuth" @click="emit('auth')">
      <template #prepend>
        <v-icon>{{ props.iconAuth }}</v-icon>
      </template>
    </v-list-item>
  </template>
  <div v-else class="d-flex align-center">
    <template v-if="props.account && props.account.invalid">
      <v-btn
        :aria-label="t('auth.authAccount', { name: props.account.name })"
        class="my-1 rounded-e-0 flex-grow-1"
        :color="props.colorAuth"
        :disabled="props.authenticating"
        height="28"
        :loading="props.authenticating"
        size="small"
        @click="emit('auth')"
      >
        <v-icon class="mr-1" size="x-large">{{ props.iconAuth }}</v-icon>
        <v-icon class="mr-4" color="red-lighten-4" size="x-large">mdi-close-circle</v-icon>
        <v-avatar
          class="mr-1"
          :icon="!props.account.avatarUrl ? 'mdi-account' : ''"
          :image="props.account.avatarUrl"
          size="22"
        />
        <span>{{ props.account.name }}</span>
      </v-btn>
      <v-btn
        :aria-label="t('auth.removeAccount', { name: props.account.name })"
        class="rounded-s-0 rounded-e"
        color="error"
        :disabled="props.authenticating"
        height="28"
        :icon="true"
        :loading="props.authenticating"
        size="x-small"
        variant="tonal"
        @click="emit('delete')"
      >
        <v-icon size="x-large"> mdi-delete </v-icon>
      </v-btn>
    </template>
    <template v-else>
      <v-btn
        class="my-1 flex-grow-1"
        :color="props.colorAuth"
        :disabled="props.authenticating"
        :loading="props.authenticating"
        size="small"
        @click="emit('auth')"
      >
        <v-icon class="mr-2" size="x-large">{{ props.iconAuth }}</v-icon>
        <span>{{ props.textAuth }}</span>
      </v-btn>
    </template>
  </div>
</template>

<style scoped></style>
