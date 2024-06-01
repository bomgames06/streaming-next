<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { locales } from '@/plugins/i18n'
import type { NotificationTypeStore } from '@/store/system/types/systemStoreType'
import useSystemStore from '@/store/system/useSystemStore'
import { useTheme } from 'vuetify'
import browser from 'webextension-polyfill'

const system = useSystemStore()
const theme = useTheme()
const i18n = useI18n()

const appVersion = import.meta.env.__APP_VERSION__
const twitterName = import.meta.env.VITE_TWITTER_NAME
const buyMeACoffeName = import.meta.env.VITE_BUY_ME_A_COFFE_NAME

function openTwitter(middle?: boolean) {
  browser.tabs.create({ url: `https://twitter.com/${twitterName}`, active: !middle })
}
function openDonation(middle?: boolean) {
  browser.tabs.create({ url: `https://www.buymeacoffee.com/${buyMeACoffeName}`, active: !middle })
}
</script>

<template>
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
            <v-radio :label="i18n.t('settings.notificationType.partial')" :value="'partial' as NotificationTypeStore" />
            <v-radio :label="i18n.t('settings.notificationType.none')" :value="'none' as NotificationTypeStore" />
          </v-radio-group>
        </v-col>
        <v-col v-if="system.notificationType === 'partial'" cols="12">
          <v-btn
            prepend-icon="mdi-broom"
            :text="i18n.t('settings.cleanNotifications')"
            @click="system.cleanNotification()"
          />
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
    <div class="mt-1 pb-1 flex-grow-0 text-center font-weight-bold text-subtitle-2 d-flex align-center justify-center">
      <span class="about-span">{{ i18n.t('settings.version', { version: appVersion }) }}</span>
      <v-divider vertical class="mx-1" />
      <v-hover>
        <template #default="{ isHovering, props }">
          <v-btn
            v-bind="props"
            variant="text"
            :color="isHovering ? 'blue-darken-1' : ''"
            :aria-label="i18n.t('settings.twitterProfile', { name: twitterName })"
            class="about-button"
            @click="openTwitter(false)"
            @keydown.space="openTwitter(false)"
            @keydown.enter="openTwitter(false)"
            @mousedown.middle.prevent="openTwitter(true)"
          >
            <v-icon class="mr-1">mdi-twitter</v-icon>
            <span>{{ twitterName }}</span>
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
            :aria-label="i18n.t('settings.sponsorProfile', { name: twitterName })"
            class="about-button"
            @click="openDonation(false)"
            @keydown.space="openDonation(false)"
            @keydown.enter="openDonation(false)"
            @mousedown.middle.prevent="openDonation(true)"
          >
            <v-icon class="mr-1">mdi-heart</v-icon>
            <span>{{ i18n.t('settings.sponsor') }}</span>
          </v-btn>
        </template>
      </v-hover>
    </div>
  </div>
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
