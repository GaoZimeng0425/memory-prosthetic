import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Library, Search, Settings, Star } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { CreateFavoriteDialog } from '@/components/features/CreateFavoriteDialog'
import { CreateTagDialog } from '@/components/features/CreateTagDialog'
import { FavoritesList } from '@/components/features/FavoritesList'
import { OtherSection } from '@/components/features/OtherSection'
import { TagsList } from '@/components/features/TagsList'

export type SidebarState = 'expanded' | 'collapsed' | 'hidden'

type NavItem = {
  id: string
  label: string
  icon: React.ElementType
  count?: number
  color?: string
}

const navItems: NavItem[] = [
  { id: 'all', label: '全部', icon: Library, count: 0 },
  { id: 'starred', label: '星标', icon: Star, count: 0, color: 'text-yellow-500' },
  { id: 'recent', label: '最近', icon: Clock, count: 0 },
]

type AppSidebarProps = {
  className?: string
  state: SidebarState
  onStateChange: (state: SidebarState) => void
  activeNav: string
  onNavChange: (nav: string) => void
  onSearchClick: () => void
  onSettingsClick: () => void
  activeFavoriteId?: number | null
  onFavoriteChange?: (favoriteId: number | null) => void
  activeTagId?: number | null
  onTagChange?: (tagId: number | null) => void
  stats?: {
    total: number
    starred: number
    recent: number
    archived: number
    deleted: number
  }
}

export const AppSidebar = ({
  className,
  state,
  onStateChange,
  activeNav,
  onNavChange,
  onSearchClick,
  onSettingsClick,
  activeFavoriteId,
  onFavoriteChange,
  activeTagId,
  onTagChange,
  stats,
}: AppSidebarProps) => {
  const [isCreateFavoriteOpen, setIsCreateFavoriteOpen] = useState(false)
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false)

  if (state === 'hidden') {
    return null
  }

  const isCollapsed = state === 'collapsed'
  const width = isCollapsed ? 'w-14' : 'w-56'

  const toggleState = () => {
    if (state === 'expanded') {
      onStateChange('collapsed')
    } else {
      onStateChange('expanded')
    }
  }

  const getCounts = () => ({
    all: stats?.total ?? 0,
    starred: stats?.starred ?? 0,
    recent: stats?.recent ?? 0,
    archive: stats?.archived ?? 0,
  })

  const counts = getCounts()

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-sidebar-border border-r bg-sidebar transition-all duration-200',
        className,
        width
      )}
    >
      {/* Header */}
      <div
        className={cn('flex h-14 items-center border-sidebar-border border-b px-3', isCollapsed && 'justify-center')}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg">
              <img alt="Memory Prosthetic" className="size-8" src="/logo-icon.svg" />
            </div>
            <span className="font-semibold text-sidebar-foreground">Memory</span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex size-8 items-center justify-center rounded-lg">
            <img alt="Memory Prosthetic" className="size-8" src="/logo-icon.svg" />
          </div>
        )}
      </div>

      {/* Search Button */}
      <div className={cn('p-2', isCollapsed && 'px-1')}>
        <Button
          className={cn(
            'w-full justify-start gap-2 text-muted-foreground hover:text-foreground',
            isCollapsed && 'justify-center px-0'
          )}
          onClick={onSearchClick}
          size={isCollapsed ? 'icon' : 'sm'}
          variant="ghost"
        >
          <Search className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>搜索</span>}
          {!isCollapsed && (
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">⌘K</kbd>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive = activeNav === item.id
          const count = counts[item.id as keyof typeof counts]

          return (
            <Button
              className={cn(
                'w-full justify-start gap-2',
                isCollapsed && 'justify-center px-0',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                !isActive && 'text-muted-foreground hover:text-foreground'
              )}
              key={item.id}
              onClick={() => onNavChange(item.id)}
              size={isCollapsed ? 'icon' : 'sm'}
              title={isCollapsed ? item.label : undefined}
              variant="ghost"
            >
              <item.icon className={cn('h-4 w-4 shrink-0', item.color)} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                      {count}
                    </span>
                  )}
                </>
              )}
            </Button>
          )
        })}

        {/* Favorites Section */}
        {!isCollapsed && (
          <div className="mt-4 border-sidebar-border border-t pt-2">
            <FavoritesList
              activeFavoriteId={activeFavoriteId ?? undefined}
              isCollapsed={isCollapsed}
              onCreateClick={() => setIsCreateFavoriteOpen(true)}
              onFavoriteChange={() => {
                // Refresh favorites list
              }}
              onFavoriteClick={(favoriteId) => {
                onFavoriteChange?.(favoriteId)
                onNavChange('favorite')
              }}
            />
          </div>
        )}

        {/* Tags Section */}
        {!isCollapsed && (
          <div className="mt-2 border-sidebar-border border-t pt-2">
            <TagsList
              activeTagId={activeTagId}
              isCollapsed={isCollapsed}
              onCreateClick={() => setIsCreateTagOpen(true)}
              onTagChange={() => {
                // Refresh tags list
              }}
              onTagClick={(tagId) => {
                onTagChange?.(tagId)
                onNavChange('tag')
              }}
            />
          </div>
        )}

        {/* Other Section */}
        {!isCollapsed && (
          <div className="mt-2 border-sidebar-border border-t pt-2">
            <OtherSection
              activeNav={activeNav}
              archivedCount={stats?.archived ?? 0}
              deletedCount={stats?.deleted ?? 0}
              isCollapsed={isCollapsed}
              onNavChange={onNavChange}
            />
          </div>
        )}
      </nav>

      {/* Create Favorite Dialog */}
      <CreateFavoriteDialog onOpenChange={setIsCreateFavoriteOpen} open={isCreateFavoriteOpen} />

      {/* Create Tag Dialog */}
      <CreateTagDialog onOpenChange={setIsCreateTagOpen} open={isCreateTagOpen} />

      {/* Footer */}
      <div className={cn('border-sidebar-border border-t p-2', isCollapsed && 'px-1')}>
        <Button
          className={cn(
            'w-full justify-start gap-2 text-muted-foreground hover:text-foreground',
            isCollapsed && 'justify-center px-0'
          )}
          onClick={onSettingsClick}
          size={isCollapsed ? 'icon' : 'sm'}
          title={isCollapsed ? '设置' : undefined}
          variant="ghost"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>设置</span>}
        </Button>

        {/* Toggle Button */}
        <Button
          className={cn(
            'mt-1 w-full justify-start gap-2 text-muted-foreground hover:text-foreground',
            isCollapsed && 'justify-center px-0'
          )}
          onClick={toggleState}
          size={isCollapsed ? 'icon' : 'sm'}
          title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          variant="ghost"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!isCollapsed && <span>折叠</span>}
        </Button>
      </div>
    </aside>
  )
}
