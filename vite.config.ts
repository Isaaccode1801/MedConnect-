// Ficheiro: vite.config.ts (LIMPO)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // UMA ÚNICA REGRA PARA TUDO
      '/proxy': {
        target: 'https://yuanqfswhberkoevtmfr.supabase.co',
        changeOrigin: true,
        // A reescrita agora é simples:
        // /proxy/caminho/api -> /caminho/api
        rewrite: (path) => path.replace(/^\/proxy/, ''), 
      }
    }
  }
})