<script setup lang="ts">
import { accountProfileUrl, accountTypeColor } from '@/utils/util'
import { useI18n } from 'vue-i18n'
import type { AccountStore, AccountStoreType } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import type { User } from '@/types/userType'
import browser from 'webextension-polyfill'
import AuthActionsButton from '@/components/auth/AuthActionsButton.vue'

const system = useSystemStore()
const { t } = useI18n()

const props = defineProps<{
  listItem?: boolean
}>()
const authenticating = defineModel<boolean>('authenticating')
const emit = defineEmits<{
  (e: 'authenticated', value: { token: string; user: User }): void
}>()

async function auth(type: AccountStoreType, forceVerify?: boolean): Promise<void> {
  authenticating.value = true
  system.loading()
  try {
    const { token, user } = await AppBusiness.auth(type, forceVerify)

    if (type === 'twitch' && !forceVerify && system.accounts[type] && system.accounts[type]?.accountId !== user.id) {
      void AppBusiness.revoke(type, token)
      return await auth(type, true)
    }

    emit('authenticated', { token, user })
  } finally {
    authenticating.value = false
    system.loaded()
  }
}

function clickAccount(account?: AccountStore, middle?: boolean): void {
  if (!account) return
  if (account.invalid) auth(account.type)
  else openProfile(account, middle)
}

function openProfile(account?: AccountStore, middle?: boolean): void {
  if (!account) return
  browser.tabs.create({ url: accountProfileUrl(account), active: !middle })
}
</script>

<template>
  <AuthActionsButton
    :account="system.accounts.twitch"
    :authenticating="authenticating"
    :color-auth="accountTypeColor('twitch')"
    :color-class="accountTypeColor('twitch', true)"
    icon-auth="mdi-twitch"
    :list-item="props.listItem"
    :text-auth="t('auth.twitchAuth')"
    data-testid="twitch-auth"
    @auth="auth('twitch', $event)"
    @click="clickAccount(system.accounts.twitch, $event)"
    @delete="system.removeAccount('twitch')"
  />
</template>

<style scoped></style>
