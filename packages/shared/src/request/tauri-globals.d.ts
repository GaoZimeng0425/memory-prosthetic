/**
 * Tauri Global Type Declaration
 */

declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

export {}
