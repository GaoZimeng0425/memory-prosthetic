import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@memory-prosthetic/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@memory-prosthetic/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@memory-prosthetic/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@memory-prosthetic/ai/config': path.resolve(__dirname, '../../packages/ai/src/config.ts'),
      '@memory-prosthetic/editor': path.resolve(__dirname, '../../packages/editor/src'),
      '@memory-prosthetic/editor/*': path.resolve(__dirname, '../../packages/editor/src/*'),
    },
  },

  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    codeInspectorPlugin({
      bundler: 'vite',
      editor: 'cursor',
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    visualizer({
      filename: path.resolve(__dirname, '../../.output/desktop-stats.html'),
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  clearScreen: false,
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
