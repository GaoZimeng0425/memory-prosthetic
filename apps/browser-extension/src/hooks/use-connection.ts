/**
 * Hook for checking connection status to desktop app
 */

import { useEffect, useState } from 'react'

import type { ConnectionStatus, HealthResponse } from '@/types/api'
import { checkHealth } from '@/utils/api'

interface UseConnectionResult {
  status: ConnectionStatus
  healthData: HealthResponse | null
  checkConnection: () => Promise<void>
  isConnected: boolean
  isChecking: boolean
}

/**
 * Hook to manage connection status with the desktop app
 * Note: No useCallback needed with React Compiler
 */
export function useConnection(): UseConnectionResult {
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)

  const checkConnection = async () => {
    setStatus('checking')

    const result = await checkHealth()

    if (result && result.status === 'ok') {
      setStatus('connected')
      setHealthData(result)
    } else {
      setStatus('disconnected')
      setHealthData(null)
    }
  }

  // Check connection on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: react compiler will handle this
  useEffect(() => {
    void checkConnection()
  }, [])

  return {
    status,
    healthData,
    checkConnection,
    isConnected: status === 'connected',
    isChecking: status === 'checking',
  }
}
