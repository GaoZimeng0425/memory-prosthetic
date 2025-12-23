/**
 * Connection Hook
 *
 * Monitors connection status to the desktop app.
 */

import { type QueryObserverResult, useQuery } from '@tanstack/react-query'

import { health } from '@/apis'
import type { ConnectionStatus, HealthResponse } from '@/types/api'

interface UseConnectionResult {
  status: ConnectionStatus
  healthData: HealthResponse | null
  checkConnection: () => Promise<QueryObserverResult<HealthResponse, Error>>
  isConnected: boolean
  isChecking: boolean
}

export function useConnection(): UseConnectionResult {
  const {
    data: healthData,
    isLoading,
    refetch: checkConnection,
  } = useQuery({
    ...health.queries.check(),
    refetchInterval: 1000,
  })

  const status: ConnectionStatus = isLoading ? 'checking' : healthData?.status === 'ok' ? 'connected' : 'disconnected'

  return {
    status,
    healthData: healthData ?? null,
    checkConnection,
    isConnected: status === 'connected',
    isChecking: status === 'checking',
  }
}
