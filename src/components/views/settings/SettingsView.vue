<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { locales } from '@/plugins/i18n'
import type { NotificationTypeStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { useTheme } from 'vuetify'
import browser from 'webextension-polyfill'
import ViewContainer from '@/components/viewContainer/ViewContainer.vue'

const system = useSystemStore()
const theme = useTheme()
const i18n = useI18n()

const appVersion = import.meta.env.__APP_VERSION__
const githubUrl = import.meta.env.VITE_GITHUB_URL
const buyMeACoffeName = import.meta.env.VITE_BUY_ME_A_COFFE_NAME
const buyMeACoffeUrl = import.meta.env.VITE_BUY_ME_A_COFFE_URL

function openGithub(middle?: boolean) {
  browser.tabs.create({ url: githubUrl, active: !middle })
}
function openDonation(middle?: boolean) {
  browser.tabs.create({ url: buyMeACoffeUrl, active: !middle })
}
</script>

<template>
  <ViewContainer>
    <div class="d-flex flex-column h-100">
      <div class="flex-grow-1">
        <h2>{{ i18n.t('settings.title') }}</h2>
        <v-divider class="mb-1" />
        <v-row>
          <v-col cols="12">
            <v-select
              :model-value="system.language"
              :label="i18n.t('settings.languages')"
              :items="locales"
              :item-value="(item) => item"
              :item-title="(item) => i18n.t(`languages.${item}`, 0, { locale: item })"
              @update:model-value="system.setLanguage($event, i18n)"
            />
          </v-col>
          <v-col cols="12">
            <v-radio-group
              :model-value="system.notificationType"
              inline
              label="Notificações"
              color="primary"
              class="mx-n3"
              @update:model-value="system.setNotificationType($event || system.notificationType)"
            >
              <v-radio :label="i18n.t('settings.notificationType.all')" :value="'all' as NotificationTypeStore" />
              <v-radio
                :label="i18n.t('settings.notificationType.partial')"
                :value="'partial' as NotificationTypeStore"
              />
              <v-radio :label="i18n.t('settings.notificationType.none')" :value="'none' as NotificationTypeStore" />
            </v-radio-group>
          </v-col>
          <v-col cols="12">
            <v-row>
              <v-col cols="auto">
                <v-btn
                  prepend-icon="mdi-broom"
                  :disabled="!system.favorites.length"
                  :text="i18n.t('settings.favorites')"
                  :aria-label="i18n.t('settings.cleanFavorites')"
                  @click="system.cleanFavorite()"
                />
              </v-col>
              <v-col v-if="system.notificationType === 'partial'" cols="auto">
                <v-btn
                  prepend-icon="mdi-broom"
                  :disabled="!system.notifications.length"
                  :text="i18n.t('settings.notifications')"
                  :aria-label="i18n.t('settings.cleanNotifications')"
                  @click="system.cleanNotification()"
                />
              </v-col>
            </v-row>
          </v-col>
          <v-col cols="12">
            <v-switch
              :model-value="system.dark"
              :true-value="true"
              :false-value="false"
              color="primary"
              :label="i18n.t('settings.darkMode')"
              @update:model-value="system.setDark(!!$event, theme)"
            />
          </v-col>
          <v-col cols="12">
            <v-switch
              :model-value="system.showAlwaysOfflines"
              :true-value="true"
              :false-value="false"
              color="primary"
              :label="i18n.t('settings.showAlwaysOfflines')"
              @update:model-value="system.setShowAlwaysOfflines(!!$event)"
            />
          </v-col>
        </v-row>
      </div>
      <div
        class="mt-1 pb-1 flex-grow-0 text-center font-weight-bold text-subtitle-2 d-flex align-center justify-center"
      >
        <span class="about-span">{{ i18n.t('settings.version', { version: appVersion }) }}</span>
        <v-divider vertical class="mx-1" />
        <v-hover>
          <template #default="{ isHovering, props }">
            <v-btn
              v-bind="props"
              variant="text"
              :color="isHovering ? 'white' : ''"
              :aria-label="i18n.t('settings.github')"
              class="about-button"
              @click="openGithub(false)"
              @mousedown.middle.prevent="openGithub(true)"
            >
              <v-icon class="mr-1">mdi-github</v-icon>
              <span>{{ i18n.t('settings.github') }}</span>
            </v-btn>
          </template>
        </v-hover>
        <v-divider vertical class="mx-1" />
        <v-hover>
          <template #default="{ isHovering, props }">
            <v-btn
              v-bind="props"
              variant="text"
              :color="isHovering ? 'red' : ''"
              :aria-label="i18n.t('settings.sponsorProfile', { name: buyMeACoffeName })"
              class="about-button"
              @click="openDonation(false)"
              @mousedown.middle.prevent="openDonation(true)"
            >
              <v-icon class="mr-1">mdi-heart</v-icon>
              <span>{{ i18n.t('settings.sponsor') }}</span>
            </v-btn>
          </template>
        </v-hover>
      </div>
    </div>
  </ViewContainer>
</template>

<style scoped lang="scss">
.about-span {
  padding: 4px;
}
.about-button {
  padding: 4px;
  text-transform: none;
  letter-spacing: normal;
  min-height: 0;
  height: auto;

  ::v-deep(.v-btn__content) {
    align-items: end;
  }
}
</style>
