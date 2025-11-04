import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FilterType = 'all' | 'active' | 'completed' | 'today' | 'week' | 'overdue'
export type SortType = 'created' | 'dueDate' | 'priority' | 'title' | 'project'

interface TaskFiltersState {
  searchQuery: string
  filter: FilterType
  sortBy: SortType
  setSearchQuery: (query: string) => void
  setFilter: (filter: FilterType) => void
  setSortBy: (sortBy: SortType) => void
  resetFilters: () => void
}

const initialState = {
  searchQuery: '',
  filter: 'all' as FilterType,
  sortBy: 'created' as SortType,
}

export const useTaskFilters = create<TaskFiltersState>()(
  persist(
    (set) => ({
      ...initialState,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilter: (filter) => set({ filter }),
      setSortBy: (sortBy) => set({ sortBy }),
      resetFilters: () => set(initialState),
    }),
    {
      name: 'task-filters',
    }
  )
)

