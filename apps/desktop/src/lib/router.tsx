import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRouter, RouterProvider, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { getCurrentWindow } from '@tauri-apps/api/window'

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

  return (
    <>
      <RouterProvider router={router} />
      <SearchWindowRouteHandler />
      {/* React Query DevTools - only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="top-right" initialIsOpen={false} />}
      {/* Router DevTools - only in development */}
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" router={router} />}
    </>
  )
}
