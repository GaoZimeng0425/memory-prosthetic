/**
 * Desktop App API Setup
 *
 * Creates API instances using AdapterManager for flexible communication
 * with the Rust backend (Tauri IPC) or HTTP server.
 */

import { AdapterManager, createApis } from '@memory-prosthetic/shared'

// Create adapter manager with auto mode
// - Development: HTTP adapter (for testing)
// - Production: Tauri IPC adapter (for performance)
const manager = new AdapterManager({
  httpBaseUrl: 'http://localhost:21890',
  initialMode: 'auto',
  onAdapterChange: (mode) => {
    console.log(`[适配器] 切换到: ${mode}`)
  },
})

// Create all API instances using the managed adapter
const apis = createApis(manager.adapter)

// Export individual APIs for convenience
export const { health, collections, favorites, tags, search, sync } = apis

// Export the bundle
export { apis }

// Export adapter manager for runtime mode switching
export { manager as adapterManager }
