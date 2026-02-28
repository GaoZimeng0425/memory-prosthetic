/**
 * Vitest Global Mock Types
 *
 * Type definitions for mocked Tauri APIs in tests
 */

import type { Mock } from 'vitest'

declare module '@tauri-apps/api/core' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>

  export const invoke: Mock<<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>>
}

declare module '@tauri-apps/api/event' {
  export interface TauriEvent {
    event: string
    payload?: unknown
  }

  export interface UnlistenFn {
    (): void
  }

  export function listen<T>(event: string, handler: (event: TauriEvent) => void): Promise<UnlistenFn>

  export function emit(event: string, payload?: unknown): Promise<void>

  export const listen: Mock
  export const emit: Mock
}
