import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'

import { AppSidebar, type SidebarState } from '@/components/AppSidebar'
import { DragRegion } from '@/components/DragRegion'

type LayoutProps = {
  sidebarStats: {
    total: number
    starred: number
    recent: number
    archived: number
    deleted: number
  }
  onSearchClick: () => void
  onSettingsClick: () => void
}

export const Layout = ({ sidebarStats, onSearchClick, onSettingsClick }: LayoutProps) => {
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <DragRegion className="h-8 shrink-0 cursor-move" />
      {/* Sidebar */}
      <AppSidebar
        className="pt-4"
        onSearchClick={onSearchClick}
        onSettingsClick={onSettingsClick}
        onStateChange={setSidebarState}
        state={sidebarState}
        stats={sidebarStats}
      />

      {/* Main content area - renders child routes via Outlet */}
      <Outlet />
    </div>
  )
}
