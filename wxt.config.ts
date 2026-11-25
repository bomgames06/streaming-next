import { defineConfig } from 'wxt'
import type { ConfigEnv } from 'wxt'
import manifestConfig from './manifest.config'
import viteConfig from './vite.config'

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifestVersion: 3,
  modules: ['@wxt-dev/webextension-polyfill'],
  imports: false,
  webExt: {
    disabled: true,
  },
  manifest: ({ command, mode }: ConfigEnv) => manifestConfig(command, mode),
  vite: () => viteConfig(),
})
