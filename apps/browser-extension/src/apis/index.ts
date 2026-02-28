/**
 * Browser Extension API Setup
 *
 * Creates API instances using HTTP adapter for communication
 * with the desktop app's HTTP server.
 */

import { createApis, createHttpAdapter } from '@memory-prosthetic/shared'
import { DEFAULT_PORT, getApiBaseUrl } from '../constants/api'

// Create HTTP adapter (refactored: takes baseUrl string directly)
const adapter = createHttpAdapter(getApiBaseUrl(DEFAULT_PORT))

// Create all API instances
const apis = createApis(adapter)

// Export individual APIs for convenience
export const { health, collections, favorites, search } = apis

// Export the bundle
export { apis }

// Re-export adapter for custom use cases
export { adapter }
