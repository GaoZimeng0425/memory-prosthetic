# Routes Documentation

This document provides an overview of all application routes, their purpose, and relationships.

## Route Structure

The application uses TanStack Router's file-based routing system. Each route file in the `routes/` directory corresponds to a specific URL path.

## Route Categories

### 1. Article Collection Routes

These routes display article lists and individual articles. They all use the `ArticlesPage` component, which adapts its behavior based on route parameters.

| Route File | URL Pattern | Description |
|------------|-------------|-------------|
| `all.tsx` | `/all` | All articles (default view) |
| `all.article.$articleId.tsx` | `/all/article/:articleId` | Specific article in "All" view |
| `starred.tsx` | `/starred` | Starred articles |
| `starred.article.$articleId.tsx` | `/starred/article/:articleId` | Specific starred article |
| `recent.tsx` | `/recent` | Recent articles (last 7 days) |
| `recent.article.$articleId.tsx` | `/recent/article/:articleId` | Specific recent article |
| `archived.tsx` | `/archived` | Archived articles |
| `archived.article.$articleId.tsx` | `/archived/article/:articleId` | Specific archived article |
| `deleted.tsx` | `/deleted` | Deleted articles (trash) |
| `deleted.article.$articleId.tsx` | `/deleted/article/:articleId` | Specific deleted article |
| `favorite.$favoriteId.tsx` | `/favorite/:favoriteId` | Articles in a specific favorite folder |
| `favorite.$favoriteId.article.$articleId.tsx` | `/favorite/:favoriteId/article/:articleId` | Article in favorite folder |
| `tag.$tagId.tsx` | `/tag/:tagId` | Articles with a specific tag |
| `tag.$tagId.article.$articleId.tsx` | `/tag/:tagId/article/:articleId` | Article with specific tag |

**Total**: 14 routes (7 base routes + 7 article detail routes)

**Component**: All use `ArticlesPage` from `@/components/pages/ArticlesPage`

**Pattern**: Parent routes show lists, child routes show specific article in context of that list

### 2. Special Purpose Routes

| Route File | URL Pattern | Component | Description |
|------------|-------------|-----------|-------------|
| `index.tsx` | `/` | (redirect) | Redirects to `/all` |
| `search.tsx` | `/search` | `SearchPage` | Search interface (search window) |
| `graph.tsx` | `/graph` | `GraphPage` | Knowledge graph visualization |
| `chat.tsx` | `/chat` | `ChatPage` | AI chat interface |
| `note.new.tsx` | `/note/new` | `NoteEditorPage` | Create new note |

**Total**: 5 special purpose routes

### 3. Root Route

| Route File | URL Pattern | Component | Description |
|------------|-------------|-----------|-------------|
| `__root.tsx` | `/` | `RootLayout` | Main app layout with sidebar, drag region, dialogs |

## Route Parameters

### Article Parameters
- `articleId`: The ID of the article to display (number as string)

### Collection Parameters
- `favoriteId`: The ID of a favorite folder (number as string)
- `tagId`: The ID of a tag (number as string)

## Navigation Patterns

### Article Detail Navigation

When navigating to an article detail view, the route maintains the parent collection context:

```typescript
// Example: Navigating to article 123 in different contexts
/all/article/123              // All articles context
/starred/article/123          // Starred context
/favorite/5/article/123       // Favorite folder 5 context
/tag/10/article/123           // Tag 10 context
```

This allows the back button and "back to list" functionality to work correctly.

### Implementation

The navigation logic is centralized in `ArticlesPage` component:

```typescript
const getArticleRoute = (id: number) => {
  if (activeNav === 'starred') {
    return { to: '/starred/article/$articleId', params: { articleId: String(id) } }
  }
  if (activeNav === 'favorite' && activeFavoriteId !== null) {
    return { to: '/favorite/$favoriteId/article/$articleId',
             params: { favoriteId: String(activeFavoriteId), articleId: String(id) } }
  }
  // ... etc
  return { to: '/all/article/$articleId', params: { articleId: String(id) } }
}
```

## Window Management

### Search Window
The `/search` route is displayed in a separate window (`search` window label).
All other routes are displayed in the main window (`main` window label).

Detection logic in `__root.tsx`:
```typescript
const label = currentWindow.label
const isSearch = label === 'search'
```

## Route Statistics

- **Total route files**: 20
- **Total lines of code**: ~500
- **Article collection routes**: 14 (70%)
- **Special purpose routes**: 5 (25%)
- **Root layout**: 1 (5%)

## Maintenance Notes

### Adding a New Article Collection Route

If you need to add a new collection type (e.g., `/unread`), follow this pattern:

1. Create `unread.tsx`:
   ```tsx
   import { createFileRoute } from '@tanstack/react-router'
   import { ArticlesPage } from '@/components/pages/ArticlesPage'

   export const Route = createFileRoute('/unread')({
     component: ArticlesPage,
   })
   ```

2. Create `unread.article.$articleId.tsx`:
   ```tsx
   import { createFileRoute } from '@tanstack/react-router'
   import { ArticlesPage } from '@/components/pages/ArticlesPage'

   export const Route = createFileRoute('/unread/article/$articleId')({
     component: ArticlesPage,
   })
   ```

3. Update `useAppNavigation` hook to include the new navigation type
4. Update `ArticlesPage` component's `getArticleRoute` function
5. Update `ArticlesPage` component's `getParentRoute` function

## Related Files

- `@/components/pages/ArticlesPage.tsx` - Main articles component
- `@/hooks/use-app-navigation.ts` - Navigation helpers
- `@/routes/route-components.ts` - Component registry (documentation)
- `@/routes/route-utils.ts` - Route utilities and types
- `@/lib/router.tsx` - Router configuration
