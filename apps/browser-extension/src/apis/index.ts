/**
 * Browser Extension API Setup
 *
 * Creates API instances using HTTP adapter for communication
 * with the desktop app's HTTP server.
 */

import { createApis, createHttpAdapter } from '@memory-prosthetic/shared'
import { DEFAULT_PORT, getApiBaseUrl } from '../constants/api'

// Create HTTP adapter with default config
const adapter = createHttpAdapter({
  baseURL: getApiBaseUrl(DEFAULT_PORT),
  timeout: 3000, // Short timeout for extension
})

// Create all API instances
const apis = createApis(adapter)

// Export individual APIs for convenience
export const { health, collections, search } = apis

// Export the bundle
export { apis }

// Re-export adapter for custom use cases
export { adapter }
