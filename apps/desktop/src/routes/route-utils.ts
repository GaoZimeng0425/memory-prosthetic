/**
 * Route Utilities
 *
 * Helper functions and types for creating consistent route definitions.
 * Reduces boilerplate in individual route files.
 */

import { createFileRoute } from '@tanstack/react-router'
import { ROUTE_COMPONENTS } from './route-components'

/**
 * Create a file route with ArticlesPage component
 *
 * Helper to reduce boilerplate for article-related routes.
 *
 * @example
 * ```tsx
 * // Instead of:
 * export const Route = createFileRoute('/all')({
 *   component: ArticlesPage,
 * })
 *
 * // Use:
 * export const Route = createArticlesRoute('/all')
 * ```
 */
export function createArticlesRoute(path: string) {
  return createFileRoute(path)({
    component: ROUTE_COMPONENTS.all,
  })
}

/**
 * Create a file route with a specific component from the registry
 *
 * @example
 * ```tsx
 * export const Route = createRouteWithComponent('/search', 'search')
 * ```
 */
export function createRouteWithComponent(path: string, componentKey: keyof typeof ROUTE_COMPONENTS) {
  return createFileRoute(path)({
    component: ROUTE_COMPONENTS[componentKey],
  })
}

/**
 * Route parameter type definitions
 *
 * Provides type safety for route parameters
 */

export interface ArticleParams {
  articleId: string
}

export interface FavoriteParams {
  favoriteId: string
}

export interface TagParams {
  tagId: string
}

export interface FavoriteArticleParams extends FavoriteParams, ArticleParams {}

export interface TagArticleParams extends TagParams, ArticleParams {}

/**
 * Route search param types
 *
 * Type definitions for route search parameters (query strings)
 */
export interface ArticleListSearchParams {
  page?: number
  limit?: number
  sort?: 'created' | 'updated' | 'title'
  order?: 'asc' | 'desc'
}

/**
 * Helper to get typed route params
 *
 * @example
 * ```tsx
 * const params = useRouteParams<typeof Route>(
 *   (params) => params.articleId
 * )
 * ```
 */
export function useRouteParams<T extends Record<string, unknown>>(selector: (params: T) => unknown) {
  const { useParams } = require('@tanstack/react-router')
  const params = useParams({ strict: false })
  return selector(params as T)
}

/**
 * Helper to build route paths with params
 *
 * @example
 * ```tsx
 * const path = buildRoutePath('/all/article/$articleId', { articleId: '123' })
 * // Returns: '/all/article/123'
 * ```
 */
export function buildRoutePath(template: string, params: Record<string, string | number>): string {
  return template.replace(/\$(\w+)/g, (_, key) => {
    const value = params[key]
    if (value === undefined) {
      throw new Error(`Missing required param: ${key}`)
    }
    return String(value)
  })
}
