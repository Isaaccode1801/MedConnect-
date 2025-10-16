// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // ignore comuns
  globalIgnores(['dist', 'node_modules', 'coverage', '.vercel', '.vite']),

  // base + TS + React Hooks + Vite Refresh
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // usa regras com type-check (melhor detecção de erros)
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // necessário para as regras type-checked (TS project service)
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // regras extras (opcional)
    rules: {
      // já vem no preset do react-refresh, mas se quiser customizar:
      // 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // testes: habilita globals do Vitest/JSDOM
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.vitest,
      },
    },
  },
])