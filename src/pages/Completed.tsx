import { useTasks } from '../store/useTasks'
import { TaskCard } from '../components/TaskCard'

/**
 * Completed page showing archived/completed tasks
 */
export function Completed() {
  const { tasks } = useTasks()
  const completedTasks = tasks.filter((task) => task.completed)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Completed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {completedTasks.length > 0 ? (
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

