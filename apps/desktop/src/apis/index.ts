/**
 * Desktop App API Setup
 *
 * Creates API instances using Tauri adapter for IPC communication
 * with the Rust backend.
 */

import { createApis, createTauriAdapter } from '@memory-prosthetic/shared'

// Create Tauri IPC adapter
const adapter = createTauriAdapter()

// Create all API instances
const apis = createApis(adapter)

// Export individual APIs for convenience
export const { health, collections, search } = apis

// Export the bundle
export { apis }

// Re-export adapter for custom use cases
export { adapter }
