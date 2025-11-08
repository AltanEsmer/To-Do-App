import { useState, useRef } from 'react'
import { ListTodo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          <h2 className="text-2xl font-bold text-foreground">{t('projects.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('projects.subtitle', { active: incompleteTasks.length, completed: completedTasks.length })}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-600 hover:scale-105 hover:shadow-lg"
          aria-label="Add new task"
        >
          + {t('task.add')}
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
            <h3 className="mb-3 text-lg font-semibold text-foreground">{t('projects.activeTasks')}</h3>
            <div className="space-y-3">
              {incompleteTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">{t('projects.completed')}</h3>
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
            title={t('projects.noTasksMatch')}
            description={t('projects.noTasksMatchDesc')}
          />
        )}

        {tasks.length === 0 && (
          <EmptyState
            icon={ListTodo}
            title={t('projects.noTasksYet')}
            description={t('projects.noTasksYetDesc')}
            action={{
              label: t('projects.createTask'),
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

