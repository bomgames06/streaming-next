import { defineConfig, mergeConfig } from 'vitest/config'
import path from 'node:path'
import viteConfig from './vite.config.ts'

export default defineConfig((configEnv) => ({
  test: {
    projects: [
      mergeConfig(viteConfig(configEnv), {
        test: {
          name: 'unit',
          setupFiles: './vitest.setup.ts',
          environment: 'jsdom',
          server: {
            deps: {
              inline: ['vuetify', '@webext-core/storage'],
            },
          },
        },
        resolve: {
          alias: {
            '@tests': path.resolve(__dirname, './tests'),
          },
        },
      }),
    ],
  },
}))
