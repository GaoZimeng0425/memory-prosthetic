/**
 * Route Component Registry
 *
 * Centralized registry for route-to-component mappings.
 * This makes it easy to see which component is used for which routes,
 * and allows for easy bulk updates if needed.
 *
 * Usage in route files:
 * ```tsx
 * import { createFileRoute } from '@tanstack/react-router'
 * import { ROUTE_COMPONENTS } from '@/routes/route-components'
 *
 * export const Route = createFileRoute('/all')({
 *   component: ROUTE_COMPONENTS.all,
 * })
 * ```
 */

import { ArticlesPage } from '@/components/pages/ArticlesPage'
import { ChatPage } from '@/components/pages/ChatPage'
import { GraphPage } from '@/components/pages/GraphPage'
import { NoteEditorPage } from '@/components/pages/NoteEditorPage'
import { SearchPage } from '@/components/pages/SearchPage'

/**
 * Route component registry
 *
 * Maps route types to their corresponding components.
 * All article-related routes use the same ArticlesPage component
 * with different route parameters to determine context.
 */
export const ROUTE_COMPONENTS = {
  // Article collection routes (all use ArticlesPage)
  all: ArticlesPage,
  allArticle: ArticlesPage,
  starred: ArticlesPage,
  starredArticle: ArticlesPage,
  recent: ArticlesPage,
  recentArticle: ArticlesPage,
  archived: ArticlesPage,
  archivedArticle: ArticlesPage,
  deleted: ArticlesPage,
  deletedArticle: ArticlesPage,
  favorite: ArticlesPage,
  favoriteArticle: ArticlesPage,
  tag: ArticlesPage,
  tagArticle: ArticlesPage,

  // Special purpose routes
  search: SearchPage,
  chat: ChatPage,
  graph: GraphPage,
  noteNew: NoteEditorPage,
  index: () => {
    // Index route component - redirects to /all
    const { navigate } = require('@tanstack/react-router')
    const { useEffect } = require('react')

    useEffect(() => {
      navigate({ to: '/all', replace: true })
    }, [navigate])

    return null
  },
} as const

/**
 * Route type definitions
 *
 * Provides type safety for route identifiers
 */
export type RouteType = keyof typeof ROUTE_COMPONENTS

/**
 * Article route paths
 *
 * Centralized constants for article-related route paths
 */
export const ARTICLE_ROUTES = {
  ALL: '/all',
  ALL_ARTICLE: '/all/article/$articleId',
  STARRED: '/starred',
  STARRED_ARTICLE: '/starred/article/$articleId',
  RECENT: '/recent',
  RECENT_ARTICLE: '/recent/article/$articleId',
  ARCHIVED: '/archived',
  ARCHIVED_ARTICLE: '/archived/article/$articleId',
  DELETED: '/deleted',
  DELETED_ARTICLE: '/deleted/article/$articleId',
  FAVORITE: '/favorite/$favoriteId',
  FAVORITE_ARTICLE: '/favorite/$favoriteId/article/$articleId',
  TAG: '/tag/$tagId',
  TAG_ARTICLE: '/tag/$tagId/article/$articleId',
} as const

/**
 * Special route paths
 */
export const SPECIAL_ROUTES = {
  SEARCH: '/search',
  CHAT: '/chat',
  GRAPH: '/graph',
  NOTE_NEW: '/note/new',
  INDEX: '/',
} as const

/**
 * All route paths combined
 */
export const ROUTES = {
  ...ARTICLE_ROUTES,
  ...SPECIAL_ROUTES,
} as const
