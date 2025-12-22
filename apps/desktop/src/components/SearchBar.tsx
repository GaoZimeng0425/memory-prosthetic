import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  onSearch: () => void
  onClear: () => void
  isLoading?: boolean
  placeholder?: string
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  onClear,
  isLoading = false,
  placeholder = 'Search your memory...',
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClear()
    }
  }

  return (
    <form className="relative flex gap-2" onSubmit={handleSubmit}>
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pr-10 pl-10"
          disabled={isLoading}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={query}
        />
        {query && (
          <button
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button disabled={isLoading || !query.trim()} type="submit">
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </form>
  )
}
