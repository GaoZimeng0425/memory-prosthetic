import { useNavigate, useParams } from '@tanstack/react-router'

type NavType = 'all' | 'starred' | 'recent' | 'graph' | 'favorite' | 'tag' | 'archived' | 'deleted'

export const useAppNavigation = () => {
  const navigate = useNavigate()
  const params = useParams({ strict: false })

  const navigateToAll = () => {
    void navigate({ to: '/' })
  }

  const navigateToStarred = () => {
    void navigate({ to: '/starred' })
  }

  const navigateToRecent = () => {
    void navigate({ to: '/recent' })
  }

  const navigateToGraph = () => {
    void navigate({ to: '/graph' })
  }

  const navigateToFavorite = (favoriteId: number | null) => {
    if (favoriteId === null) {
      // favoriteId 为 null 表示未分类，但未分类应该有独立的ID
      // 如果确实需要处理 null，可以查找"未分类"收藏夹的ID
      console.warn('navigateToFavorite called with null favoriteId - should use actual favorite ID')
      return
    }
    void navigate({ to: '/favorite/$favoriteId', params: { favoriteId: String(favoriteId) } })
  }

  const navigateToTag = (tagId: number) => {
    void navigate({ to: '/tag/$tagId', params: { tagId: String(tagId) } })
  }

  const navigateToArticle = (articleId: number) => {
    void navigate({ to: '/article/$articleId', params: { articleId: String(articleId) } })
  }

  const navigateToArchived = () => {
    void navigate({ to: '/archived' })
  }

  const navigateToDeleted = () => {
    void navigate({ to: '/deleted' })
  }

  // 根据当前路由确定 activeNav
  const getActiveNav = (): NavType => {
    const pathname = window.location.pathname
    if (pathname.startsWith('/graph')) return 'graph'
    if (pathname.startsWith('/favorite')) return 'favorite'
    if (pathname.startsWith('/tag')) return 'tag'
    if (pathname === '/starred' || pathname.startsWith('/starred/article')) return 'starred'
    if (pathname === '/recent' || pathname.startsWith('/recent/article')) return 'recent'
    if (pathname === '/archived' || pathname.startsWith('/archived/article')) return 'archived'
    if (pathname === '/deleted' || pathname.startsWith('/deleted/article')) return 'deleted'
    // For nested article routes, determine nav from path
    if (pathname.includes('/favorite/') && pathname.includes('/article/')) {
      return 'favorite'
    }
    if (pathname.includes('/tag/') && pathname.includes('/article/')) {
      return 'tag'
    }
    // Fallback for /article/$articleId (default route)
    if (pathname.startsWith('/article/')) {
      return 'all'
    }
    return 'all'
  }

  return {
    navigateToAll,
    navigateToStarred,
    navigateToRecent,
    navigateToGraph,
    navigateToFavorite,
    navigateToTag,
    navigateToArticle,
    navigateToArchived,
    navigateToDeleted,
    getActiveNav,
    params,
  }
}
