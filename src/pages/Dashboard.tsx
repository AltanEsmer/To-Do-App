import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTasks } from '../store/useTasks'
import { TaskCard } from '../components/TaskCard'
import { AddTaskModal } from '../components/AddTaskModal'
import { ProgressBar } from '../components/ProgressBar'
import { EmptyState } from '../components/EmptyState'
import { isDateToday } from '../utils/dateHelpers'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal'

/**
 * Dashboard page showing today's tasks and progress overview
 */
export function Dashboard() {
  const { t } = useTranslation()
  const { tasks } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

  useKeyboardShortcuts({
    onQuickAdd: () => setIsModalOpen(true),
    onShowShortcuts: () => setIsShortcutsOpen(true),
  })

  const todayTasks = tasks.filter((task) => task.dueDate && isDateToday(task.dueDate))
  const incompleteTodayTasks = todayTasks.filter((task) => !task.completed)
  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-600 hover:scale-105 hover:shadow-lg"
          aria-label="Add new task"
        >
          + {t('task.add')}
        </button>
      </div>

      <div className="mb-6">
        <ProgressBar completed={completedCount} total={tasks.length} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-4">
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            {t('dashboard.todaysTasks')} ({incompleteTodayTasks.length})
          </h3>
          {incompleteTodayTasks.length > 0 ? (
            <div className="space-y-3">
              {incompleteTodayTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title={t('dashboard.noTasksToday')}
              description={t('dashboard.noTasksTodayDesc')}
            />
          )}
        </div>

        {todayTasks.filter((task) => task.completed).length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">{t('dashboard.completedToday')}</h3>
            <div className="space-y-3">
              {todayTasks
                .filter((task) => task.completed)
                .map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
            </div>
          </div>
        )}
      </div>

      <AddTaskModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      <KeyboardShortcutsModal open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
    </div>
  )
}

