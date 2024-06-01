<script setup lang="ts">
import { accountProfileUrl, accountTypeColor } from '@/utils/util'
import { useI18n } from 'vue-i18n'
import type { AccountStore, AccountStoreType } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import AppBusiness from '@/services/business/appBusiness'
import type { User } from '@/types/userType'
import AuthActionsButton from '@/components/auth/AuthActionsButton.vue'
import browser from 'webextension-polyfill'

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

    if (!forceVerify && system.accounts[type] && system.accounts[type]?.accountId !== user.id) {
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
    :list-item="props.listItem"
    :text-auth="t('auth.twitchAuth')"
    icon-auth="mdi-twitch"
    :color-auth="accountTypeColor('twitch')"
    :color-class="accountTypeColor('twitch', true)"
    :authenticating="authenticating"
    :account="system.accounts.twitch"
    @auth="auth('twitch', $event)"
    @delete="system.removeAccount('twitch')"
    @click="clickAccount(system.accounts.twitch, $event)"
  />
</template>

<style scoped></style>
