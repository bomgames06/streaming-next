<script setup lang="ts">
import useSystemStore from '@/store/system/useSystemStore'
import { useTheme } from 'vuetify'
import { locales } from '@/plugins/i18n'
import { useI18n } from 'vue-i18n'
import { onKeyDownEsc } from '@/utils/util'

const system = useSystemStore()
const theme = useTheme()
const i18n = useI18n()
</script>

<template>
  <h1 class="d-sr-only">{{ i18n.t('common.projectName') }}</h1>
  <v-layout>
    <v-app-bar :height="system.appBarHeight" class="app-bar">
      <div class="d-flex w-100 position-relative align-center">
        <v-progress-linear v-if="!!system.loadingCount" absolute indeterminate location="bottom" color="primary" />
        <v-spacer />
        <v-menu :close-on-content-click="false">
          <template #activator="{ props }">
            <v-btn
              :icon="true"
              size="36"
              :aria-label="i18n.t('simpleLayout.languageAriaLabelButton')"
              class="rounded-lg"
              v-bind="props"
            >
              <v-icon>mdi-translate</v-icon>
            </v-btn>
          </template>
          <template #default="{ isActive }">
            <v-list
              :selected="[system.language]"
              mandatory
              @update:selected="system.setLanguage($event[0], i18n)"
              @keydown.prevent="onKeyDownEsc($event, () => (isActive.value = false))"
            >
              <v-list-item
                v-for="locale in locales"
                :key="locale"
                role="option"
                :aria-selected="system.language === locale"
                :value="locale"
              >
                <v-list-item-title>
                  {{ i18n.t(`languages.${locale}`, 0, { locale: locale }) }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </template>
        </v-menu>
        <v-btn
          :icon="true"
          size="36"
          :aria-label="
            i18n.t(system.dark ? 'simpleLayout.themeAriaLabelButton.dark' : 'simpleLayout.themeAriaLabelButton.light')
          "
          class="rounded-lg"
          @click="system.setDark(!system.dark, theme)"
        >
          <v-icon>
            {{ system.dark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
          </v-icon>
        </v-btn>
      </div>
    </v-app-bar>
    <v-main class="d-flex">
      <v-container class="h-100 overflow-y-auto pa-3 flex-grow-1">
        <slot />
      </v-container>
    </v-main>
  </v-layout>
</template>

<style scoped lang="scss"></style>
