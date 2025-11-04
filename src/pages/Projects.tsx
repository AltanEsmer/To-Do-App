import { useState } from 'react'
import { useTasks } from '../store/useTasks'
import { TaskCard } from '../components/TaskCard'
import { AddTaskModal } from '../components/AddTaskModal'

/**
 * Projects page showing all tasks (incomplete and completed)
 */
export function Projects() {
  const { tasks } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const incompleteTasks = tasks.filter((task) => !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)

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
          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          aria-label="Add new task"
        >
          + Add Task
        </button>
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

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No tasks yet. Create your first task to get started!</p>
          </div>
        )}
      </div>

      <AddTaskModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}

