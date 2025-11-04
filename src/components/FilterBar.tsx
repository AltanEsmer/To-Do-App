import { Filter } from 'lucide-react'
import clsx from 'clsx'
import { useTaskFilters, FilterType } from '../store/useTaskFilters'

interface FilterOption {
  value: FilterType
  label: string
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'overdue', label: 'Overdue' },
]

interface FilterBarProps {
  className?: string
}

/**
 * Filter bar component for task filtering
 */
export function FilterBar({ className = '' }: FilterBarProps) {
  const { filter, setFilter } = useTaskFilters()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
              filter === option.value
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
            aria-pressed={filter === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

