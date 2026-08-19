/**
 * Layout State Hook
 *
 * Manages UI state related to app layout including sidebar, dialogs, and overlays.
 * Extracted from __root.tsx for better separation of concerns.
 */

import { useState } from 'react'
import type { SidebarState } from '@/components/AppSidebar'

/**
 * Layout state management hook
 *
 * Provides state and setters for common layout UI elements.
 *
 * @returns Layout state and setters
 */
export function useLayoutState() {
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreateFavoriteOpen, setIsCreateFavoriteOpen] = useState(false)

  return {
    // Sidebar state
    sidebarState,
    setSidebarState,

    // Overlay states
    isSearchOpen,
    setIsSearchOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isCreateFavoriteOpen,
    setIsCreateFavoriteOpen,
  }
}

/**
 * Layout handlers hook
 *
 * Provides handler functions for common layout actions.
 *
 * @param setState - Function to set layout state
 * @returns Handler functions
 */
export function useLayoutHandlers(setState: {
  setIsSearchOpen: (open: boolean) => void
  setIsSettingsOpen: (open: boolean) => void
  setSidebarState: (state: SidebarState) => void
}) {
  const handleSearchClick = () => {
    setState.setIsSearchOpen(true)
  }

  const handleSettingsClick = () => {
    setState.setIsSettingsOpen(true)
  }

  const toggleSidebar = () => {
    setState.setSidebarState((s: SidebarState) => (s === 'expanded' ? 'collapsed' : 'expanded'))
  }

  return {
    handleSearchClick,
    handleSettingsClick,
    toggleSidebar,
  }
}
