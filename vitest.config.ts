import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/desktop/src/test/setup.ts'],
    include: ['apps/desktop/src/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
        '**/src/test/**',
        'apps/desktop/src/components/ui/**',
      ],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/desktop/src'),
      '@memory-prosthetic/ui': path.resolve(__dirname, './packages/ui/src'),
      '@memory-prosthetic/shared': path.resolve(__dirname, './packages/shared/src'),
      '@memory-prosthetic/ai': path.resolve(__dirname, './packages/ai/src'),
      '@memory-prosthetic/ai/config': path.resolve(__dirname, './packages/ai/src/config.ts'),
      '@memory-prosthetic/editor': path.resolve(__dirname, './packages/editor/src'),
      '@memory-prosthetic/editor/*': path.resolve(__dirname, './packages/editor/src/*'),
    },
  },
  // Workaround for monorepo workspace resolution
  optimizeDeps: {
    disabled: true,
  },
})
