<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import type { Ref } from 'vue'
import { onMounted, onUnmounted } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { locales } from '@/plugins/i18n'
import AuthActions from '@/components/auth/AuthActions.vue'
import type { User } from '@/types/userType'
import Mousetrap from 'mousetrap'
import { onKeyDownEsc } from '@/utils/util'

const system = useSystemStore()
const theme = useTheme()
const i18n = useI18n()

const sidebar = ref<boolean>(false)
const sidebarComp = computed(() => sidebar)
const authenticating = ref<boolean>(false)

onMounted(() => {
  Mousetrap.bind('alt+1', () => system.setView('streams'))
  Mousetrap.bind(
    'alt+2',
    () => system.accounts.twitch && !system.accounts.twitch.invalid && system.setView('categories')
  )
  Mousetrap.bind('alt+3', () => system.accounts.twitch && !system.accounts.twitch.invalid && system.setView('search'))
  Mousetrap.bind('alt+s', () => system.setView('settings'))
})
onUnmounted(() => {
  Mousetrap.unbind('alt+1')
  Mousetrap.unbind('alt+2')
  Mousetrap.unbind('alt+3')
  Mousetrap.unbind('alt+s')
})

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

function openSettings(menu: Ref<boolean>) {
  system.setView('settings')
  menu.value = false
}

const accesskey = navigator.userAgent.toUpperCase().includes('MAC') ? 'option' : 'alt'
</script>

<template>
  <h1 class="d-sr-only">{{ i18n.t('common.projectName') }}</h1>
  <div aria-live="polite" class="d-sr-only">
    <h2>{{ i18n.t('accessibility.shortkeys') }}</h2>
    <ul>
      <li>
        {{ i18n.t('accessibility.global') }}
        <ul>
          <li>{{ i18n.t('accessibility.openStreamView', { accesskey }) }}</li>
          <li v-if="system.accounts.twitch && !system.accounts.twitch.invalid">
            {{ i18n.t('accessibility.openCategoriesView', { accesskey }) }}
          </li>
          <li v-if="system.accounts.twitch && !system.accounts.twitch.invalid">
            {{ i18n.t('accessibility.openSearchView', { accesskey }) }}
          </li>
          <li>{{ i18n.t('accessibility.openSettingsView', { accesskey }) }}</li>
        </ul>
      </li>
      <li>
        {{ i18n.t('accessibility.streamView') }}
        <ul>
          <li>{{ i18n.t('accessibility.focusFilterInput', { accesskey }) }}</li>
        </ul>
      </li>
    </ul>
  </div>
  <v-layout>
    <v-app-bar :height="system.appBarHeight" class="app-bar">
      <div class="d-flex w-100 position-relative align-center">
        <div class="d-flex align-center profile-content">
          <v-progress-linear v-if="system.isLoading" absolute indeterminate location="bottom" color="primary" />
          <v-app-bar-nav-icon :size="system.appBarHeight" class="rounded-lg" @click="sidebar = !sidebar" />
          <v-menu :close-on-content-click="false">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text"
                :height="system.appBarHeight"
                class="text-none text-body-2 px-2 profile-button flex-grow-1 flex-shrink-1"
              >
                <v-avatar
                  :image="system.mainAccount?.avatarUrl"
                  :icon="!system.mainAccount?.avatarUrl ? 'mdi-account' : ''"
                  :size="system.appBarHeight * (26 / 36)"
                  class="mr-1"
                />
                <span class="font-weight-bold d-inline-block text-truncate">{{ system.mainAccount?.name }}</span>
              </v-btn>
            </template>
            <template #default="{ isActive }">
              <v-list class="py-0" @keydown.prevent="onKeyDownEsc($event, () => (isActive.value = false))">
                <v-list-group color="primary" class="group-indent">
                  <template #activator="{ props }">
                    <v-list-item v-bind="props" :title="i18n.t('appLayout.accounts')">
                      <template #prepend>
                        <v-icon>mdi-account-multiple</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                  <AuthActions v-model:authenticating="authenticating" list-item @authenticated="authenticated" />
                </v-list-group>
                <v-list-group color="primary" class="group-indent">
                  <template #activator="{ props }">
                    <v-list-item v-bind="props" :title="i18n.t('appLayout.language')">
                      <template #prepend>
                        <v-icon>mdi-translate</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                  <v-list-item
                    v-for="locale in locales"
                    :key="locale"
                    role="option"
                    :active="locale === system.language"
                    :aria-selected="locale === system.language"
                    :title="i18n.t(`languages.${locale}`, 0, { locale: locale })"
                    @click="system.setLanguage(locale, i18n)"
                  />
                </v-list-group>
                <v-list-item
                  :title="system.dark ? i18n.t('appLayout.dark') : i18n.t('appLayout.light')"
                  @click="system.setDark(!system.dark, theme)"
                >
                  <template #prepend>
                    <v-icon>{{ system.dark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
                  </template>
                </v-list-item>
                <v-list-item
                  v-if="system.view !== 'settings'"
                  :title="i18n.t('views.settings')"
                  @click="openSettings(isActive)"
                >
                  <template #prepend>
                    <v-icon>mdi-cog</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </template>
          </v-menu>
        </div>
        <div class="d-flex align-center justify-end app-bar-view flex-grow-1">
          <slot name="appbar" />
        </div>
      </div>
    </v-app-bar>
    <v-navigation-drawer v-model="sidebar" rail :rail-width="system.appBarHeight">
      <slot v-if="sidebar" name="sidebar" :sidebar="sidebarComp" />
    </v-navigation-drawer>
    <v-main class="d-flex">
      <div class="overflow-y-auto flex-grow-1">
        <slot />
      </div>
    </v-main>
  </v-layout>
</template>

<style scoped lang="scss">
.group-indent {
  ::v-deep(.v-list-group__items) {
    max-height: 100px;
    overflow-y: auto;

    .v-list-item--density-compact:not(.v-list-item--nav).v-list-item--one-line {
      padding-inline-start: 16px !important;
    }
  }
}
.account-group-indent {
  @extend .group-indent;

  ::v-deep(.v-list-group__items) {
    max-height: 140px;
  }
}

.profile-content {
  max-width: 50%;
}

.profile-button {
  ::v-deep(.v-btn__content) {
    overflow-x: hidden;
  }
}
.app-bar-view {
  ::v-deep(.v-label.v-field-label) {
    font-size: 0.75rem !important;
    margin: 0 8px;
  }
  ::v-deep(.v-field__input) {
    font-size: 0.75rem !important;
    padding: 2px 6px;
    min-height: 0;
  }
}
</style>
