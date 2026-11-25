import { defineConfig, mergeConfig } from 'vitest/config'
import path from 'node:path'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import viteConfig from './vite.config.ts'

export default defineConfig(async () => ({
  test: {
    coverage: {
      provider: 'v8' as const,
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
    projects: [
      mergeConfig(viteConfig(), {
        plugins: [await WxtVitest()],
        test: {
          name: 'unit',
          setupFiles: './vitest.setup.ts',
          environment: 'jsdom',
          server: {
            deps: {
              inline: ['vuetify'],
            },
          },
        },
        resolve: {
          alias: {
            '@tests': path.resolve(import.meta.dirname, './tests'),
          },
        },
      }),
    ],
  },
}))
