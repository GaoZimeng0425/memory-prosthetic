/**
 * Request Module - Barrel Export
 */

// Adapter types and implementations
export type { AdapterConfig, AdapterFactory, RequestAdapter } from './adapter'
export { createHttpAdapter } from './http-adapter'
export { createTauriAdapter } from './tauri-adapter'
export { createHybridAdapter } from './hybrid-adapter'
export type { EnhancedHybridAdapter } from './hybrid-adapter'
export { AdapterManager } from './adapter-manager'
export type { AdapterMode, AdapterManagerOptions, ConnectionTestResult } from './adapter-manager'
// Provider
export type { QueryProviderProps } from './provider'
export { QueryProvider } from './provider'
// Query client
export type { QueryClientOptions } from './query-client'
export {
  createQueryClient,
  getQueryClient,
  INFINITY_CACHE_TIME,
  LONG_CACHE_TIME,
  SHORT_CACHE_TIME,
} from './query-client'
