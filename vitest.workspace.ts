import { defineWorkspace } from 'vitest/config'
import path from 'node:path'

export default defineWorkspace([
  {
    extends: 'vite.config.ts',
    test: {
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
  },
])
