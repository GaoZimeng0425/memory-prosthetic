import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@memory-prosthetic/ui/components/ui/tabs'
import { Library, Search } from 'lucide-react'

import { CollectionList } from '@/components/CollectionList'
import { EmptyState } from '@/components/EmptyState'
import { SearchBar } from '@/components/SearchBar'
import { SearchResults } from '@/components/SearchResults'
import { useCollections } from '@/hooks/use-collections'
import { useSearch } from '@/hooks/use-search'
import '@memory-prosthetic/ui/styles/globals.css'

function App() {
  const [activeTab, setActiveTab] = useState('collections')
  const { query, setQuery, results, isLoading: searchLoading, error: searchError, search, clearResults } = useSearch()
  const { collections, stats, isLoading: collectionsLoading, refresh } = useCollections()

  const hasSearched = results.length > 0 || searchError

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <span className="font-bold text-sm text-white">M</span>
              </div>
              <h1 className="font-semibold text-xl">Memory Prosthetic</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger className="flex items-center gap-2" value="collections">
                <Library className="h-4 w-4" />
                收集 ({collections.length})
              </TabsTrigger>
              <TabsTrigger className="flex items-center gap-2" value="search">
                <Search className="h-4 w-4" />
                搜索
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6" value="collections">
              {collectionsLoading && collections.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <CollectionList collections={collections} onRefresh={refresh} stats={stats} />
              )}
            </TabsContent>

            <TabsContent className="space-y-6" value="search">
              <SearchBar
                isLoading={searchLoading}
                onClear={clearResults}
                onQueryChange={setQuery}
                onSearch={search}
                query={query}
              />

              {searchError ? (
                <EmptyState message={searchError} type="error" />
              ) : hasSearched && results.length === 0 ? (
                <EmptyState type="no-results" />
              ) : results.length > 0 ? (
                <SearchResults query={query} results={results} />
              ) : (
                <EmptyState type="search" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

export default App
