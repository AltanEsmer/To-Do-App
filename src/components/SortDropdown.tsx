import { forwardRef } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { useTaskFilters, SortType } from '../store/useTaskFilters'

interface SortOption {
  value: SortType
  label: string
}

const sortOptions: SortOption[] = [
  { value: 'created', label: 'Date Created' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: 'project', label: 'Project' },
]

interface SortDropdownProps {
  className?: string
}

/**
 * Sort dropdown component for task sorting
 */
export const SortDropdown = forwardRef<HTMLSelectElement, SortDropdownProps>(({ className = '' }, ref) => {
  const { sortBy, setSortBy } = useTaskFilters()

  return (
    <div className={`relative ${className}`}>
      <label htmlFor="sort-select" className="sr-only">
        Sort tasks by
      </label>
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <select
          ref={ref}
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
          className="focus-ring rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
})

