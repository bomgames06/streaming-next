<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import useSystemStore from '@/store/system/useSystemStore'
import AuthButtons from '@/components/auth/AuthActions.vue'
import type { User } from '@/types/userType'
import { ref } from 'vue'

const system = useSystemStore()
const { t } = useI18n()

const authenticating = ref(false)

async function authenticated({ token, user }: { token: string; user: User }): Promise<void> {
  system.loading()
  authenticating.value = true
  try {
    system.addAccount({
      type: user.type,
      accountId: user.id,
      name: user.name,
      login: user.login,
      avatarUrl: user.avatarUrl,
      token,
    })

    await system.fetchAccounts()
    system.setScreen('home')
  } finally {
    system.loaded()
    authenticating.value = false
  }
}
</script>

<template>
  <v-row align="center" class="h-100" justify="center">
    <v-col class="text-center" cols="auto">
      <p>{{ t('auth.mandatoryMessage') }}</p>
      <div class="d-flex flex-column">
        <AuthButtons v-model:authenticating="authenticating" @authenticated="authenticated" />
      </div>
      <small class="d-block text-medium-emphasis">{{ t('auth.twitchExpireMessage') }}</small>
    </v-col>
  </v-row>
</template>

<style scoped></style>
