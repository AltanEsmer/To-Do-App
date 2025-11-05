import { useState, useEffect, forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { useTaskFilters } from '../store/useTaskFilters'

interface SearchBarProps {
  className?: string
}

/**
 * Search bar component with debounced input for task search
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(({ className = '' }, ref) => {
  const { searchQuery, setSearchQuery } = useTaskFilters()
  const [localQuery, setLocalQuery] = useState(searchQuery)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, setSearchQuery])

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <input
        ref={ref}
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder="Search tasks..."
        className="focus-ring w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground"
        aria-label="Search tasks"
      />
      {localQuery && (
        <button
          onClick={() => setLocalQuery('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})

