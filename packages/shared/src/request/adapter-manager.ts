/**
 * Adapter Manager
 *
 * Manages adapter lifecycle, mode switching, and provides fallback recovery.
 */

import type { RequestAdapter } from './adapter'
import { createHttpAdapter } from './http-adapter'
import { createTauriAdapter } from './tauri-adapter'
import { createHybridAdapter, type EnhancedHybridAdapter } from './hybrid-adapter'

export type AdapterMode = 'auto' | 'http' | 'tauri'

export interface AdapterManagerOptions {
  httpBaseUrl: string
  initialMode?: AdapterMode
  onAdapterChange?: (mode: AdapterMode) => void
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean
  adapter: 'http' | 'tauri'
  latency: number
  error?: string
}

/**
 * Adapter Manager
 *
 * Responsibilities:
 * - Manage adapter lifecycle
 * - Handle environment switching
 * - Provide fallback recovery
 * - Test connectivity
 */
export class AdapterManager {
  private hybridAdapter: EnhancedHybridAdapter
  private currentMode: AdapterMode
  private httpBaseUrl: string

  constructor(private options: AdapterManagerOptions) {
    this.httpBaseUrl = options.httpBaseUrl

    // Initialize adapters
    const tauriAdapter = createTauriAdapter()
    const httpAdapter = createHttpAdapter(options.httpBaseUrl)

    // Create hybrid adapter
    this.hybridAdapter = createHybridAdapter({
      httpBaseUrl: options.httpBaseUrl,
      tauriAdapter,
      httpAdapter,
    })

    this.currentMode = options.initialMode || 'auto'

    // Apply initial mode if not auto
    if (this.currentMode !== 'auto') {
      this.hybridAdapter.switchAdapter(this.currentMode)
    }
  }

  get adapter(): RequestAdapter {
    return this.hybridAdapter
  }

  /**
   * Switch adapter mode
   */
  setMode(mode: AdapterMode): void {
    this.currentMode = mode

    if (mode !== 'auto') {
      this.hybridAdapter.switchAdapter(mode)
    } else {
      this.hybridAdapter.switchAdapter('auto')
    }

    this.options.onAdapterChange?.(mode)
  }

  /**
   * Get current mode
   */
  getMode(): AdapterMode {
    return this.currentMode
  }

  /**
   * Get current underlying adapter type
   */
  getCurrentAdapterType(): 'http' | 'tauri' {
    return this.hybridAdapter.getCurrentAdapter()
  }

  /**
   * Test connection health
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now()

    try {
      // Try a simple health check
      await this.adapter.get('/api/health')
      const latency = performance.now() - start

      return {
        success: true,
        adapter: this.getCurrentAdapterType(),
        latency,
      }
    } catch (error) {
      return {
        success: false,
        adapter: this.getCurrentAdapterType(),
        latency: -1,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get statistics about the current adapter
   */
  getStats(): {
    mode: AdapterMode
    currentAdapter: 'http' | 'tauri'
    httpBaseUrl: string
  } {
    return {
      mode: this.currentMode,
      currentAdapter: this.getCurrentAdapterType(),
      httpBaseUrl: this.httpBaseUrl,
    }
  }
}
