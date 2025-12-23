/**
 * Unified QueryClient Configuration
 *
 * Shared react-query configuration for both desktop and browser extension.
 */

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

export interface QueryClientOptions {
  /** Error handler for queries */
  onQueryError?: (error: Error) => void
  /** Error handler for mutations */
  onMutationError?: (error: Error) => void
}

/** Long cache time preset (10 minutes) */
export const LONG_CACHE_TIME = {
  staleTime: 60_000 * 10,
  gcTime: 60_000 * 10,
} as const

/** Infinite cache time preset */
export const INFINITY_CACHE_TIME = {
  gcTime: Number.POSITIVE_INFINITY,
  staleTime: Number.POSITIVE_INFINITY,
} as const

/** Short cache time preset (30 seconds) */
export const SHORT_CACHE_TIME = {
  staleTime: 30_000,
  gcTime: 60_000,
} as const

/**
 * Create a configured QueryClient instance
 */
export function createQueryClient(options?: QueryClientOptions): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        options?.onQueryError?.(error)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Skip if mutation has its own error handler
        if (mutation.options.onError) return
        options?.onMutationError?.(error)
      },
    }),
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

/** Default QueryClient instance */
let defaultQueryClient: QueryClient | null = null

/**
 * Get or create the default QueryClient
 */
export function getQueryClient(options?: QueryClientOptions): QueryClient {
  if (!defaultQueryClient) {
    defaultQueryClient = createQueryClient(options)
  }
  return defaultQueryClient
}
