import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import TurboConsole from 'unplugin-turbo-console/vite'
import type { Plugin } from 'vite'
import { imagetools } from 'vite-imagetools'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'wxt'

// Plugin to handle wxt/utils/storage resolution issues
// Since we're using browser.storage.local directly, we can ignore wxt/utils/storage imports
const wxtStorageResolver = (): Plugin => {
  return {
    name: 'wxt-storage-resolver',
    resolveId(id) {
      // Ignore wxt/utils/storage imports (we use browser.storage.local directly)
      if (id === 'wxt/utils/storage') {
        return '\0virtual:wxt-storage'
      }
      return null
    },
    load(id) {
      // Return empty module for virtual wxt-storage
      if (id === '\0virtual:wxt-storage') {
        return '// Virtual module - using browser.storage.local directly instead'
      }
      return null
    },
  }
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => {
    return {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@memory-prosthetic/ui': path.resolve(__dirname, '../../packages/ui/src'),
          '@memory-prosthetic/shared': path.resolve(__dirname, '../../packages/shared/src'),
        },
      },
      plugins: [
        wxtStorageResolver(),
        react({
          babel: {
            plugins: ['babel-plugin-react-compiler'],
          },
        }),
        tailwindcss(),
        svgr({ include: '**/*.svg?react' }),
        imagetools(),
        TurboConsole({
          inspector: true,
          launchEditor: {
            specifiedEditor: 'cursor',
          },
        }),
      ],
    }
  },
  srcDir: 'src',
  analysis: {
    enabled: true,
    outputFile: '../../.output/browser-extension-analysis.html',
  },
  imports: {
    presets: ['react'],
  },
  manifest: {
    name: 'Memory Prosthetic',
    description: 'Your personal memory assistant - collect, search, and recall information effortlessly.',
    permissions: ['storage', 'tabs', 'scripting', 'activeTab', 'notifications', 'sidePanel'],
    // biome-ignore lint/style/useNamingConvention: ignore
    host_permissions: ['*://*/*'],
    action: {}, // Empty action to enable browser.action.onClicked listener
  },
})
