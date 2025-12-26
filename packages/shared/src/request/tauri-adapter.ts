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
  'POST /api/collect': 'collect',
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
  'POST /api/collection/tags': 'add_collection_tags',
  'DELETE /api/collection/tag': 'remove_collection_tag',
  'GET /api/collection/tags': 'get_collection_tags',

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
      // For collection tags, use params directly (collection_id from params)
      if (endpoint.includes('/collection/tags')) {
        // Extract collection_id from params
        const collectionId = params?.collection_id
        console.log('Getting collection tags for:', collectionId, 'command:', command)
        if (collectionId) {
          // Tauri commands use camelCase parameter names
          return invokeCommand<T>(command, { collectionId })
        }
        return invokeCommand<T>(command, params)
      }
      // For collections list, convert snake_case to camelCase for Tauri
      if (endpoint.includes('/collections') && !endpoint.includes('/collection/')) {
        const args: Record<string, unknown> = {}
        if (params) {
          // Handle both camelCase (from frontend) and snake_case (from API)
          // Convert to camelCase for Tauri commands
          if (params.favoriteId !== undefined || params.favorite_id !== undefined) {
            args.favoriteId = params.favoriteId ?? params.favorite_id
          }
          if (params.uncategorized !== undefined) {
            args.uncategorized = params.uncategorized
          }
          if (params.tagIds !== undefined || params.tag_ids !== undefined) {
            args.tagIds = params.tagIds ?? params.tag_ids
          }
          if (params.status !== undefined) {
            args.status = params.status
          }
        }
        // Always include limit and offset with defaults if not provided
        args.limit = params?.limit ?? 1000
        args.offset = params?.offset ?? 0
        return invokeCommand<T>(command, args)
      }
      // Extract ID from endpoint if present (e.g., /api/favorite/123 -> id: 123)
      const idMatch = endpoint.match(/\/(\d+)$/)
      if (idMatch) {
        const args: Record<string, unknown> = { id: Number.parseInt(idMatch[1], 10) }
        if (params) {
          Object.assign(args, params)
        }
        return invokeCommand<T>(command, args)
      }
      return invokeCommand<T>(command, params)
    },

    post: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('POST', endpoint)
      // For collection tags, extract collection_id and tag_ids from data
      if (endpoint.includes('/collection/tags') && data && typeof data === 'object') {
        const tagData = data as unknown as { collection_id: number; tag_ids: number[] }
        console.log('Adding collection tags:', {
          collectionId: tagData.collection_id,
          tagIds: tagData.tag_ids,
          command,
        })
        // Tauri commands use camelCase parameter names
        return invokeCommand<T>(command, {
          collectionId: tagData.collection_id,
          tagIds: tagData.tag_ids,
        })
      }
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    put: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('PUT', endpoint)
      return invokeCommand<T>(command, data ? { request: data } : undefined)
    },

    patch: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const command = getCommand('PATCH', endpoint)
      // Extract ID from endpoint if present (e.g., /api/favorite/123 -> id: 123)
      const idMatch = endpoint.match(/\/(\d+)$/)
      const args: Record<string, unknown> = {}

      if (idMatch) {
        args.id = Number.parseInt(idMatch[1], 10)
      }

      // For set_collection_favorite, extract favoriteId from data
      if (endpoint.includes('/collection/') && data && typeof data === 'object') {
        const patchData = data as unknown as { favoriteId?: number | null }
        if ('favoriteId' in patchData) {
          args.favoriteId = patchData.favoriteId
          return invokeCommand<T>(command, args)
        }
      }

      if (data) {
        args.request = data
      }

      return invokeCommand<T>(command, Object.keys(args).length > 0 ? args : undefined)
    },

    delete: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      const command = getCommand('DELETE', endpoint)
      // For collection tag removal, use params directly (collection_id and tag_id from params)
      if (endpoint.includes('/collection/tag')) {
        const collectionId = params?.collection_id
        const tagId = params?.tag_id
        console.log('Removing collection tag:', { collectionId, tagId, command })
        if (collectionId && tagId) {
          // Tauri commands use camelCase parameter names
          return invokeCommand<T>(command, {
            collectionId,
            tagId,
          })
        }
        return invokeCommand<T>(command, params)
      }
      // Extract ID from endpoint if present (e.g., /api/favorite/123 -> id: 123)
      const idMatch = endpoint.match(/\/(\d+)$/)
      if (idMatch) {
        const id = Number.parseInt(idMatch[1], 10)
        return invokeCommand<T>(command, { id })
      }
      return invokeCommand<T>(command, params)
    },
  }
}
