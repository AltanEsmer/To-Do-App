import { useState, useRef } from 'react'
import { ListTodo } from 'lucide-react'
import { useTasks } from '../store/useTasks'
import { TaskCard } from '../components/TaskCard'
import { AddTaskModal } from '../components/AddTaskModal'
import { EmptyState } from '../components/EmptyState'
import { SearchBar } from '../components/SearchBar'
import { FilterBar } from '../components/FilterBar'
import { SortDropdown } from '../components/SortDropdown'
import { useFilteredTasks } from '../utils/useFilteredTasks'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal'

/**
 * Projects page showing all tasks (incomplete and completed)
 */
export function Projects() {
  const { tasks } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterInputRef = useRef<HTMLButtonElement>(null)
  const sortInputRef = useRef<HTMLSelectElement>(null)

  const filteredTasks = useFilteredTasks(tasks)
  const incompleteTasks = filteredTasks.filter((task) => !task.completed)
  const completedTasks = filteredTasks.filter((task) => task.completed)

  useKeyboardShortcuts({
    onQuickAdd: () => setIsModalOpen(true),
    onSearchFocus: () => searchInputRef.current?.focus(),
    onFilterFocus: () => filterInputRef.current?.focus(),
    onSortFocus: () => sortInputRef.current?.focus(),
    onShowShortcuts: () => setIsShortcutsOpen(true),
  })

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {incompleteTasks.length} active, {completedTasks.length} completed
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-600 hover:scale-105 hover:shadow-lg"
          aria-label="Add new task"
        >
          + Add Task
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <SearchBar ref={searchInputRef} />
        <div className="flex flex-wrap items-center gap-4">
          <FilterBar ref={filterInputRef} />
          <SortDropdown ref={sortInputRef} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {incompleteTasks.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Active Tasks</h3>
            <div className="space-y-3">
              {incompleteTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">Completed</h3>
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && tasks.length > 0 && (
          <EmptyState
            icon={ListTodo}
            title="No tasks match your filters"
            description="Try adjusting your search or filters to find what you're looking for."
          />
        )}

        {tasks.length === 0 && (
          <EmptyState
            icon={ListTodo}
            title="No tasks yet"
            description="Create your first task to get started on your productivity journey!"
            action={{
              label: 'Create Task',
              onClick: () => setIsModalOpen(true),
            }}
          />
        )}
      </div>

      <AddTaskModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      <KeyboardShortcutsModal open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
    </div>
  )
}

