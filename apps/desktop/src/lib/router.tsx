import { useEffect, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRouter, RouterProvider, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Bug } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { routeTree } from '@/routeTree.gen'

// Create a new router instance
export const createAppRouter = (queryClient: QueryClient) => {
  return createRouter({
    routeTree,
    context: {
      queryClient,
    },
  })
}

// Export router type for type safety
export type Router = ReturnType<typeof createAppRouter>

// Component to handle search window route initialization
function SearchWindowRouteHandler() {
  const router = useRouter()

  useEffect(() => {
    const initSearchWindowRoute = async () => {
      try {
        const currentWindow = getCurrentWindow()
        const label = currentWindow.label
        if (label === 'search') {
          const currentPath = window.location.pathname
          if (currentPath !== '/search') {
            console.log('[Router] Search window detected, navigating to /search from', currentPath)
            // Use replace to avoid adding to history
            await router.navigate({ to: '/search', replace: true })
          }
        }
      } catch (error) {
        console.error('[Router] Failed to check window type:', error)
        // Fallback: check by route path
        const currentPath = window.location.pathname
        if (currentPath !== '/search') {
          // If we're in a search window but path is wrong, navigate to /search
          await router.navigate({ to: '/search', replace: true })
        }
      }
    }
    // Run immediately, don't wait for next tick
    void initSearchWindowRoute()
  }, [router])

  return null
}

// Router provider component
type RouterProviderProps = {
  queryClient: QueryClient
}

export const AppRouterProvider = ({ queryClient }: RouterProviderProps) => {
  const router = createAppRouter(queryClient)
  const [showReactQueryDevtools, setShowReactQueryDevtools] = useState(false)
  const [showRouterDevtools, setShowRouterDevtools] = useState(false)

  return (
    <>
      <RouterProvider router={router} />
      <SearchWindowRouteHandler />

      {/* DevTools Control Button - only in development */}
      {import.meta.env.DEV && (
        <div className="fixed right-4 bottom-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 w-9 rounded-full shadow-lg" size="icon" variant="outline">
                <Bug className="h-4 w-4" />
                <span className="sr-only">开发工具</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>开发工具</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showReactQueryDevtools} onCheckedChange={setShowReactQueryDevtools}>
                React Query DevTools
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showRouterDevtools} onCheckedChange={setShowRouterDevtools}>
                Router DevTools
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* React Query DevTools - only in development */}
      {showReactQueryDevtools && <ReactQueryDevtools buttonPosition="top-right" initialIsOpen={false} />}
      {/* Router DevTools - only in development */}
      {showRouterDevtools && <TanStackRouterDevtools position="bottom-right" router={router} />}
    </>
  )
}
