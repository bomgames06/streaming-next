import globals from 'globals'
import vue from 'eslint-plugin-vue'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintrcAutoImport from './.eslintrc-auto-import.mjs'

export default [
  {
    ignores: ['**/node_modules', '**/dist', '.eslintrc-auto-import.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
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
      'vue/attributes-order': ['error'],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
    },
  },
]
