/**
 * Health API
 *
 * Health check endpoint for verifying desktop app connectivity.
 */

import { queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { HealthResponse } from '../types/api'

const ENDPOINTS = {
  health: '/api/health',
} as const

const KEYS = {
  all: ['health'] as const,
  check: () => [...KEYS.all, 'check'] as const,
}

export function createHealthApi(adapter: RequestAdapter) {
  const api = {
    /** Check if the desktop app is running */
    check: () => adapter.get<HealthResponse>(ENDPOINTS.health),
  }

  const queries = {
    /** Health check query options */
    check: () =>
      queryOptions({
        queryKey: KEYS.check(),
        queryFn: api.check,
        staleTime: 0, // Always refetch
        gcTime: 0,
      }),
  }

  return {
    keys: KEYS,
    api,
    queries,
  }
}

export type HealthApi = ReturnType<typeof createHealthApi>
