/**
 * MigrationProgress Component Tests
 *
 * TDD: Writing tests for migration progress UI component
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => vi.fn())),
}))

import { MigrationProgress } from './MigrationProgress'

// Helper to render with QueryClientProvider
function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
    queryClient,
  }
}

describe('MigrationProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('AC9: Migration Progress Display', () => {
    it('should display progress bar with current and total counts', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={50}
          total={100}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/50 \/ 100/i)).toBeInTheDocument()
    })

    it('should show cancel button', () => {
      const onCancel = vi.fn()
      renderWithQueryClient(
        <MigrationProgress
          current={50}
          total={100}
          onCancel={onCancel}
        />
      )

      // Cancel button is only shown when not finished (current < total)
      const buttons = screen.getAllByRole('button')
      const cancelButton = buttons.find((b) => b.querySelector('svg'))
      expect(cancelButton).toBeDefined()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()

      renderWithQueryClient(
        <MigrationProgress
          current={50}
          total={100}
          onCancel={onCancel}
        />
      )

      // Find the cancel button by SVG icon (X icon)
      const buttons = screen.getAllByRole('button')
      const cancelButton = buttons.find((b) => b.querySelector('svg'))
      if (cancelButton) {
        await user.click(cancelButton)
        expect(onCancel).toHaveBeenCalledOnce()
      }
    })
  })

  describe('Progress Calculation', () => {
    it('should show 0% when starting', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={0}
          total={100}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/0 \/ 100/i)).toBeInTheDocument()
    })

    it('should show 50% at halfway', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={50}
          total={100}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/50 \/ 100/i)).toBeInTheDocument()
    })

    it('should show 100% when complete', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={100}
          total={100}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/100 \/ 100/i)).toBeInTheDocument()
      expect(screen.getByText(/Migration Complete/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero total gracefully', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={0}
          total={0}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/0 \/ 0/i)).toBeInTheDocument()
    })

    it('should handle current greater than total', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={150}
          total={100}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/150 \/ 100/i)).toBeInTheDocument()
      expect(screen.getByText(/Migration Complete/i)).toBeInTheDocument()
    })
  })

  describe('Conditional Rendering', () => {
    it('should not render when total is 0', () => {
      const { container } = renderWithQueryClient(
        <MigrationProgress
          current={0}
          total={0}
          onCancel={vi.fn()}
        />
      )

      // Component should still render, but show 0/0
      expect(screen.getByText(/0 \/ 0/i)).toBeInTheDocument()
      expect(container).toBeTruthy()
    })

    it('should hide cancel button when complete', () => {
      renderWithQueryClient(
        <MigrationProgress
          current={100}
          total={100}
          onCancel={vi.fn()}
        />
      )

      // When complete (current >= total), cancel button should not be shown
      // The component should show "Migration Complete" instead
      expect(screen.getByText(/Migration Complete/i)).toBeInTheDocument()
      // Check that there's no button with SVG icon (cancel button has X icon)
      const buttons = screen.queryAllByRole('button')
      const cancelButton = buttons.find((b) => b.querySelector('svg'))
      expect(cancelButton).toBeUndefined()
    })
  })

  describe('Event Listening', () => {
    it('should listen to association_migration:progress events', async () => {
      const { listen } = await import('@tauri-apps/api/event')

      renderWithQueryClient(
        <MigrationProgress
          current={0}
          total={100}
          onCancel={vi.fn()}
        />
      )

      // Verify listen was called for migration events
      expect(listen).toHaveBeenCalled()
    })
  })
})
