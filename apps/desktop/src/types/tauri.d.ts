/**
 * Global type declarations for Tauri API
 */

declare module '@tauri-apps/api/event' {
  interface Event<T> {
    id: number
    event: string
    payload: T
    label: string
  }

  export function listen<T>(
    event: string,
    handler: (event: Event<T>) => void
  ): Promise<UnlistenFn>

  export function emit<T>(event: string, payload?: T): Promise<void>

  export interface UnlistenFn {
    (): void
  }
}
