import { useState } from 'react'
import { useTasks } from '../store/useTasks'
import { TaskCard } from '../components/TaskCard'
import { AddTaskModal } from '../components/AddTaskModal'
import { ProgressBar } from '../components/ProgressBar'
import { isDateToday } from '../utils/dateHelpers'

/**
 * Dashboard page showing today's tasks and progress overview
 */
export function Dashboard() {
  const { tasks } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const todayTasks = tasks.filter((task) => task.dueDate && isDateToday(task.dueDate))
  const incompleteTodayTasks = todayTasks.filter((task) => !task.completed)
  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Today's overview</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          aria-label="Add new task"
        >
          + Add Task
        </button>
      </div>

      <div className="mb-6">
        <ProgressBar completed={completedCount} total={tasks.length} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-4">
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            Today's Tasks ({incompleteTodayTasks.length})
          </h3>
          {incompleteTodayTasks.length > 0 ? (
            <div className="space-y-3">
              {incompleteTodayTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks due today. Great job!</p>
          )}
        </div>

        {todayTasks.filter((task) => task.completed).length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Completed Today</h3>
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
    </div>
  )
}

