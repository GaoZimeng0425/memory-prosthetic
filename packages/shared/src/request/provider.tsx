/**
 * Query Provider Component
 *
 * Provides react-query context to the application.
 */

import type { FC, PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { getQueryClient, type QueryClientOptions } from './query-client'

export interface QueryProviderProps extends PropsWithChildren {
  options?: QueryClientOptions
}

/**
 * QueryProvider component
 *
 * Wraps the application with react-query's QueryClientProvider.
 */
export const QueryProvider: FC<QueryProviderProps> = ({ children, options }) => {
  const queryClient = getQueryClient(options)

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
