import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import webExtension, { readJsonFile } from 'vite-plugin-web-extension'
import { fileURLToPath, URL } from 'node:url'
import manifestConfig from './manifest.config'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

const pkg = readJsonFile('package.json')

function generateManifest(command: 'build' | 'serve', oAuth2ClientId: string) {
  return {
    version: pkg.version,
    ...manifestConfig(command, oAuth2ClientId),
  }
}

export default defineConfig(({ command }) => {
  return {
    base: './',
    plugins: [
      vue({
        template: { transformAssetUrls },
      }),
      Vuetify({
        autoImport: true,
      }),
      Components({
        dts: 'src/components.d.ts',
      }),
      webExtension({
        browser: process.env.TARGET || 'chrome',
        manifest: () => generateManifest(command, process.env.VITE_APP_OAUTH2_YOUTUBE_CLIENTID || ''),
        watchFilePaths: ['package.json', 'manifest.config.ts'],
        disableAutoLaunch: true,
      }),
      AutoImport({
        imports: ['vue'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
          filepath: './.eslintrc-auto-import.mjs',
        },
        vueTemplate: true,
        viteOptimizeDeps: true,
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
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  }
})
