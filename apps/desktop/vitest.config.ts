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
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    typecheck: {
      tsconfig: path.resolve(__dirname, './tsconfig.json'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
        '**/test/**',
        'src/components/ui/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@memory-prosthetic/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@memory-prosthetic/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@memory-prosthetic/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@memory-prosthetic/ai/config': path.resolve(__dirname, '../../packages/ai/src/config.ts'),
      '@memory-prosthetic/editor': path.resolve(__dirname, '../../packages/editor/src'),
      '@memory-prosthetic/editor/*': path.resolve(__dirname, '../../packages/editor/src/*'),
      // Ensure single React instance
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  // Workaround for monorepo workspace resolution
  optimizeDeps: {
    disabled: true,
  },
})
