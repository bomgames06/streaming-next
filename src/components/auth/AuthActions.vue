<script setup lang="ts">
import { accountProfileUrl, accountTypeColor, isYoutubeEnabled } from '@/utils/util'
import { useI18n } from 'vue-i18n'
import type { AccountStore, AccountStoreType } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import type { User } from '@/types/userType'
import { browser } from 'wxt/browser'
import AuthActionsButton from '@/components/auth/AuthActionsButton.vue'
import { mdiTwitch, mdiYoutube } from '@mdi/js'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<{
  listItem?: boolean
}>()
const authenticating = defineModel<boolean>('authenticating')
const emit = defineEmits<{
  (e: 'authenticated', value: { token: string; user: User; expiresAt?: number }): void
}>()

async function auth(type: AccountStoreType, forceVerify?: boolean): Promise<void> {
  authenticating.value = true
  system.loading()
  try {
    const { token, user, expiresAt } = await AppBusiness.auth(type, forceVerify)

    if (type === 'twitch' && !forceVerify && system.accounts[type] && system.accounts[type]?.accountId !== user.id) {
      void AppBusiness.revoke(type, token)
      return await auth(type, true)
    }

    // Only providers with short lived tokens have an expiration
    emit('authenticated', expiresAt === undefined ? { token, user } : { token, user, expiresAt })
  } finally {
    authenticating.value = false
    system.loaded()
  }
}

function clickAccount({ account, middle }: { account: AccountStore; middle?: boolean }): void {
  if (account.invalid) auth(account.type)
  else openProfile(account, middle)
}

function openProfile(account: AccountStore, middle?: boolean): void {
  browser.tabs.create({ url: accountProfileUrl(account), active: !middle })
}
</script>

<template>
  <AuthActionsButton
    :account="system.accounts.twitch"
    :authenticating="authenticating"
    :color-auth="accountTypeColor('twitch')"
    :color-class="accountTypeColor('twitch', true)"
    :icon-auth="mdiTwitch"
    :list-item="props.listItem"
    :text-auth="t('auth.twitchAuth')"
    data-testid="twitch-auth"
    @auth="auth('twitch', $event)"
    @click="clickAccount"
    @delete="system.removeAccount('twitch')"
  />
  <AuthActionsButton
    v-if="isYoutubeEnabled()"
    :account="system.accounts.youtube"
    :authenticating="authenticating"
    :color-auth="accountTypeColor('youtube')"
    :color-class="accountTypeColor('youtube', true)"
    :icon-auth="mdiYoutube"
    :list-item="props.listItem"
    :text-auth="t('auth.youtubeAuth')"
    data-testid="youtube-auth"
    @auth="auth('youtube', $event)"
    @click="clickAccount"
    @delete="system.removeAccount('youtube')"
  />
</template>

<style scoped></style>
