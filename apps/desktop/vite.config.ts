import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@memory-prosthetic/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@memory-prosthetic/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@memory-prosthetic/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@memory-prosthetic/ai/config': path.resolve(__dirname, '../../packages/ai/src/config.ts'),
    },
  },

  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    codeInspectorPlugin({
      bundler: 'vite',
    }),
    tailwindcss(),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
})
