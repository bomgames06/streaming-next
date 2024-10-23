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
const twitterName = import.meta.env.VITE_TWITTER_NAME
const twitterUrl = import.meta.env.VITE_TWITTER_URL

function openGithub(middle?: boolean) {
  browser.tabs.create({ url: githubUrl, active: !middle })
}
function openDonation(middle?: boolean) {
  browser.tabs.create({ url: buyMeACoffeUrl, active: !middle })
}
function openTwitter(middle?: boolean) {
  browser.tabs.create({ url: twitterUrl, active: !middle })
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
              :item-title="(item) => i18n.t(`languages.${item}`, 0, { locale: item })"
              :item-value="(item) => item"
              :items="locales"
              :label="i18n.t('settings.languages')"
              :model-value="system.language"
              @update:model-value="system.setLanguage($event, i18n)"
            />
          </v-col>
          <v-col cols="12">
            <v-radio-group
              class="mx-n3"
              color="primary"
              inline
              label="Notificações"
              :model-value="system.notificationType"
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
                  :aria-label="i18n.t('settings.cleanFavorites')"
                  :disabled="!system.favorites.length"
                  prepend-icon="mdi-broom"
                  :text="i18n.t('settings.favorites')"
                  @click="system.cleanFavorite()"
                />
              </v-col>
              <v-col v-if="system.notificationType === 'partial'" cols="auto">
                <v-btn
                  :aria-label="i18n.t('settings.cleanNotifications')"
                  :disabled="!system.notifications.length"
                  prepend-icon="mdi-broom"
                  :text="i18n.t('settings.notifications')"
                  @click="system.cleanNotification()"
                />
              </v-col>
            </v-row>
          </v-col>
          <v-col cols="12">
            <v-switch
              color="primary"
              :false-value="false"
              :label="i18n.t('settings.darkMode')"
              :model-value="system.dark"
              :true-value="true"
              @update:model-value="system.setDark(!!$event, theme)"
            />
          </v-col>
          <v-col cols="12">
            <v-switch
              color="primary"
              :false-value="false"
              :label="i18n.t('settings.showAlwaysOfflines')"
              :model-value="system.showAlwaysOfflines"
              :true-value="true"
              @update:model-value="system.setShowAlwaysOfflines(!!$event)"
            />
          </v-col>
        </v-row>
      </div>
      <div
        class="mt-1 pb-1 flex-grow-0 text-center font-weight-bold text-subtitle-2 d-flex align-center justify-center"
      >
        <span class="about-span">{{ i18n.t('settings.version', { version: appVersion }) }}</span>
        <v-divider class="mx-1" vertical />
        <v-btn
          :aria-label="i18n.t('settings.github')"
          class="about-button"
          variant="text"
          @click="openGithub(false)"
          @mousedown.middle.prevent="openGithub(true)"
        >
          <v-icon class="mr-1">mdi-github</v-icon>
          <span>{{ i18n.t('settings.github') }}</span>
        </v-btn>
        <v-divider class="mx-1" vertical />
        <v-hover>
          <template #default="{ isHovering, props }">
            <v-btn
              v-bind="props"
              :aria-label="i18n.t('settings.twitterProfile', { name: twitterName })"
              class="about-button"
              :color="isHovering ? 'blue-darken-1' : ''"
              variant="text"
              @click="openTwitter(false)"
              @mousedown.middle.prevent="openTwitter(true)"
            >
              <v-icon class="mr-1">mdi-twitter</v-icon>
              <span>{{ i18n.t('settings.twitter') }}</span>
            </v-btn>
          </template>
        </v-hover>
        <v-divider class="mx-1" vertical />
        <v-hover>
          <template #default="{ isHovering, props }">
            <v-btn
              v-bind="props"
              :aria-label="i18n.t('settings.sponsorProfile', { name: buyMeACoffeName })"
              class="about-button"
              :color="isHovering ? 'red' : ''"
              variant="text"
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
