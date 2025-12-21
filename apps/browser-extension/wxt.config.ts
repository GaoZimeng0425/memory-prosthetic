import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => {
    return {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@memory-prosthetic/ui': path.resolve(__dirname, '../../packages/ui/src'),
        },
      },
      plugins: [tailwindcss()],
    }
  },
})
