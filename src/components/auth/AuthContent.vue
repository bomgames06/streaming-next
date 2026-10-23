<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import type { User } from '@/types/userType'
import AuthActions from '@/components/auth/AuthActions.vue'

const system = useSystemStore()
const { t } = useI18n()

const authenticating = ref(false)

async function authenticated(value: { token: string; user: User; expiresAt?: number }): Promise<void> {
  authenticating.value = true
  try {
    await system.addAuthenticatedAccount(value)
  } finally {
    authenticating.value = false
  }
}
</script>

<template>
  <v-row class="h-100 align-center justify-center">
    <v-col class="text-center" cols="auto">
      <p>{{ t('auth.mandatoryMessage') }}</p>
      <div class="d-flex flex-column">
        <AuthActions @authenticated="authenticated" />
      </div>
      <small class="d-block text-medium-emphasis">{{ t('auth.twitchExpireMessage') }}</small>
    </v-col>
  </v-row>
</template>

<style scoped></style>
