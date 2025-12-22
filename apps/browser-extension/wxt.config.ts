import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import TurboConsole from 'unplugin-turbo-console/vite'
import { imagetools } from 'vite-imagetools'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => {
    return {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@memory-prosthetic/ui': path.resolve(__dirname, '../../packages/ui/src'),
        },
      },
      plugins: [
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
    outputFile: '.wxt/analysis/index.html',
  },
  imports: {
    presets: ['react'],
  },
  manifest: {
    name: 'Contract Extension',
    description: 'Manage contract placeholders with ease.',
    permissions: ['storage', 'tabs', 'scripting', 'activeTab', 'notifications', 'sidePanel'],
    // biome-ignore lint/style/useNamingConvention: ignore
    host_permissions: ['*://*/*'],
    action: {}, // Empty action to enable browser.action.onClicked listener
  },
})
