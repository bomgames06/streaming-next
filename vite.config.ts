import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import webExtension, { readJsonFile } from 'vite-plugin-web-extension'
import { fileURLToPath, URL } from 'node:url'
import manifestConfig from './manifest.config'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Components from 'unplugin-vue-components/vite'
import vueI1VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

const pkg = readJsonFile('package.json')

function generateManifest(command: 'build' | 'serve') {
  return {
    version: pkg.version,
    ...manifestConfig(command),
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [
      vue({
        template: { transformAssetUrls },
      }),
      Vuetify({
        autoImport: true,
      }),
      vueI1VueI18nPlugin({
        runtimeOnly: false,
      }),
      Components(),
      webExtension({
        browser: process.env.TARGET || 'chrome',
        manifest: () => generateManifest(command),
        watchFilePaths: ['package.json', 'manifest.config.ts'],
        disableAutoLaunch: true,
      }),
    ],
    define: {
      'import.meta.env.__APP_VERSION__': JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
    },
  }
})
