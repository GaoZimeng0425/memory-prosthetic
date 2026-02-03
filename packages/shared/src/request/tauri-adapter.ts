/**
 * Tauri IPC Request Adapter
 *
 * Uses Tauri's invoke() for IPC communication with Rust backend.
 * Maps REST-like endpoints to Tauri commands.
 */

import { invoke } from '@tauri-apps/api/core'

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
  'POST /api/collect': 'collect',
  'POST /api/notes': 'create_note',
  'PUT /api/collection': 'update_collection',
  'DELETE /api/collection': 'delete_collection',
  'PATCH /api/collection': 'set_collection_favorite',

  // Favorites
  'GET /api/favorites': 'get_favorites',
  'GET /api/favorite': 'get_favorite',
  'POST /api/favorites': 'create_favorite',
  'PATCH /api/favorite': 'update_favorite',
  'DELETE /api/favorite': 'delete_favorite',

  // Tags
  'GET /api/tags': 'get_tags',
  'GET /api/tag': 'get_tag',
  'POST /api/tags': 'create_tag',
  'PATCH /api/tag': 'update_tag',
  'DELETE /api/tag': 'delete_tag',

  // Collection operations
  'POST /api/collection/archive': 'archive_collection',
  'POST /api/collection/restore': 'restore_collection',
  'POST /api/collection/permanently-delete': 'permanently_delete_collection',
  'POST /api/collection/toggle-star': 'toggle_collection_star',
  'POST /api/collection/tags': 'add_collection_tags',
  'DELETE /api/collection/tag': 'remove_collection_tag',
  'GET /api/collection/tags': 'get_collection_tags',

  // Search
  'POST /api/search': 'search',

  // Sync
  'GET /api/sync': 'get_sync',
  'GET /api/favorites/': 'get_favorite_collections',
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
    const result = await invoke<CommandResult<T>>(command, args)
    return result.data
  }

  return {
    get: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      const command = getCommand('GET', endpoint)
      // For GET requests with params, wrap in { request: params }
      // Extract ID from endpoint if present (e.g., /api/favorite/123 -> id: 123)
      const idMatch = endpoint.match(/\/(\d+)$/)
      if (idMatch) {
        const args: Record<string, unknown> = { id: Number.parseInt(idMatch[1], 10) }
        if (params) {
          Object.assign(args, params)
        }
        return invokeCommand<T>(command, args)
      }
      // For requests with params, wrap in { request: params }
      return invokeCommand<T>(command, params ? { request: params } : undefined)
    },

    post: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('POST', endpoint)
      // All POST requests wrap data in { request: data }
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    put: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('PUT', endpoint)
      // Extract ID from endpoint if present (e.g., /api/collections/92 -> id: 92)
      const idMatch = endpoint.match(/\/(\d+)$/)
      if (idMatch && data && typeof data === 'object') {
        // If ID is in endpoint and data is an object, merge id with data and wrap in request
        const requestData: Record<string, unknown> = { id: Number.parseInt(idMatch[1], 10) }
        Object.assign(requestData, data)
        return invokeCommand<T>(command, { request: requestData })
      }
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    patch: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('PATCH', endpoint)
      // Extract ID from endpoint if present (e.g., /api/collection/123 -> id: 123)
      const idMatch = endpoint.match(/\/(\d+)$/)

      if (idMatch && data && typeof data === 'object') {
        // If ID is in endpoint and data is an object, merge id with data and wrap in request
        const requestData: Record<string, unknown> = { id: Number.parseInt(idMatch[1], 10) }
        Object.assign(requestData, data)
        return invokeCommand<T>(command, { request: requestData })
      }

      // All PATCH requests wrap data in { request: data }
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    delete: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      const command = getCommand('DELETE', endpoint)
      // Extract ID from endpoint if present (e.g., /api/favorite/123 -> id: 123)
      const idMatch = endpoint.match(/\/(\d+)$/)
      if (idMatch) {
        const id = Number.parseInt(idMatch[1], 10)
        return invokeCommand<T>(command, { id })
      }
      // For DELETE requests with params, wrap in { request: params }
      return invokeCommand<T>(command, params ? { request: params } : undefined)
    },
  }
}
