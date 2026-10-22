import type { UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

// Shared Vite config used by both WXT (wxt.config.ts) and Vitest (vitest.config.ts)
export default function viteConfig(): UserConfig {
  return {
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
  }
}
