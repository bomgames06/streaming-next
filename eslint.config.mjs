import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslintrcAutoImport from './.eslintrc-auto-import.mjs'

export default [
  {
    ignores: ['**/node_modules', '**/dist', '.eslintrc-auto-import.mjs'],
  },
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig({ extends: ['base'] }),
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.webextensions,
        ...globals.browser,
        ...globals.node,
        ...eslintrcAutoImport.globals,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error'],
      'vue/multi-word-component-names': 'off',
      'no-use-before-define': 'off',

      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          allowNamedExports: false,
        },
      ],
    },
  },
]
