/**
 * API Client for communicating with the desktop app
 */

import { API_ENDPOINTS, CONNECTION_TIMEOUT, getApiBaseUrl } from '@/constants/api'
import type { CollectRequest, CollectResponse, HealthResponse } from '@/types/api'

/**
 * Check if the desktop app is running
 * @returns Health response if connected, null if not
 */
export async function checkHealth(port?: number): Promise<HealthResponse | null> {
  const baseUrl = getApiBaseUrl(port)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)

    const response = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data: HealthResponse = await response.json()
    return data
  } catch {
    // Connection refused or timeout
    return null
  }
}

/**
 * Collect content to the desktop app
 * @param request The collect request
 * @returns Collect response
 */
export async function collectContent(request: CollectRequest, port?: number): Promise<CollectResponse> {
  const baseUrl = getApiBaseUrl(port)

  try {
    const response = await fetch(`${baseUrl}${API_ENDPOINTS.COLLECT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data: CollectResponse = await response.json()
    return data
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to connect to desktop app',
      },
    }
  }
}
