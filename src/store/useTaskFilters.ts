import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FilterType = 'all' | 'active' | 'completed' | 'today' | 'week' | 'overdue'
export type SortType = 'created' | 'dueDate' | 'priority' | 'title' | 'project'

interface TaskFiltersState {
  searchQuery: string
  filter: FilterType
  sortBy: SortType
  selectedTags: string[]
  groupByTag: boolean
  showRelatedOnly: boolean
  setSearchQuery: (query: string) => void
  setFilter: (filter: FilterType) => void
  setSortBy: (sortBy: SortType) => void
  setSelectedTags: (tags: string[]) => void
  addTag: (tagId: string) => void
  removeTag: (tagId: string) => void
  setGroupByTag: (group: boolean) => void
  setShowRelatedOnly: (show: boolean) => void
  resetFilters: () => void
}

const initialState = {
  searchQuery: '',
  filter: 'all' as FilterType,
  sortBy: 'created' as SortType,
  selectedTags: [] as string[],
  groupByTag: false,
  showRelatedOnly: false,
}

export const useTaskFilters = create<TaskFiltersState>()(
  persist(
    (set) => ({
      ...initialState,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilter: (filter) => set({ filter }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSelectedTags: (tags) => set({ selectedTags: tags }),
      addTag: (tagId) => set((state) => ({ 
        selectedTags: [...state.selectedTags, tagId] 
      })),
      removeTag: (tagId) => set((state) => ({ 
        selectedTags: state.selectedTags.filter(id => id !== tagId) 
      })),
      setGroupByTag: (group) => set({ groupByTag: group }),
      setShowRelatedOnly: (show) => set({ showRelatedOnly: show }),
      resetFilters: () => set(initialState),
    }),
    {
      name: 'task-filters',
    }
  )
)

