/**
 * Tauri IPC Request Adapter
 *
 * Uses Tauri's invoke() for IPC communication with Rust backend.
 * Maps REST-like endpoints to Tauri commands.
 */

import type { RequestAdapter } from './adapter'

/** Result wrapper from Tauri commands */
interface CommandResult<T> {
  data: T
}

/**
 * Endpoint to Tauri command mapping
 *
 * Format: 'METHOD /endpoint' -> 'command_name'
 */
const ENDPOINT_COMMANDS: Record<string, string> = {
  // Health
  'GET /api/health': 'health_check',

  // Collections
  'GET /api/collections': 'get_collections',
  'GET /api/collections/stats': 'get_collection_stats',
  'GET /api/collection': 'get_collection',
  'POST /api/collect': 'collect_content',
  'DELETE /api/collection': 'delete_collection',

  // Search
  'POST /api/search': 'search',
}

/**
 * Parse endpoint and get corresponding Tauri command
 */
function getCommand(method: string, endpoint: string): string {
  const key = `${method} ${endpoint}`
  const command = ENDPOINT_COMMANDS[key]

  if (!command) {
    // Try pattern matching for parameterized routes
    const pattern = Object.keys(ENDPOINT_COMMANDS).find((k) => {
      const [m, path] = k.split(' ')
      if (m !== method) return false
      // Simple pattern match (e.g., /api/collection matches /api/collection/123)
      return endpoint.startsWith(path)
    })

    if (pattern) {
      return ENDPOINT_COMMANDS[pattern]
    }

    throw new Error(`No Tauri command mapping for: ${key}`)
  }

  return command
}

/**
 * Create a Tauri IPC adapter
 *
 * Requires @tauri-apps/api to be available in the runtime.
 */
export function createTauriAdapter(): RequestAdapter {
  // Dynamically import Tauri API to avoid issues in non-Tauri environments
  const invokeCommand = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<CommandResult<T>>(command, args)
    return result.data
  }

  return {
    get: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      const command = getCommand('GET', endpoint)
      return invokeCommand<T>(command, params)
    },

    post: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('POST', endpoint)
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    put: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('PUT', endpoint)
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    patch: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('PATCH', endpoint)
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    delete: async <T>(endpoint: string): Promise<T> => {
      const command = getCommand('DELETE', endpoint)
      return invokeCommand<T>(command)
    },
  }
}
