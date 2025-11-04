import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTasks, Task } from '../store/useTasks'
import { formatTaskDate, isOverdue } from '../utils/dateHelpers'
import { TaskDetailsModal } from './TaskDetailsModal'
import clsx from 'clsx'
import * as Checkbox from '@radix-ui/react-checkbox'

interface TaskCardProps {
  task: Task
}

/**
 * Task card component with checkbox, title, due date, and priority indicator
 */
export function TaskCard({ task }: TaskCardProps) {
  const { toggleComplete, deleteTask } = useTasks()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isOverdueTask = task.dueDate && !task.completed && isOverdue(task.dueDate)

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        'group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary-300 dark:hover:border-primary-700',
        task.completed && 'opacity-60'
      )}
    >
      <Checkbox.Root
        checked={task.completed}
        onCheckedChange={() => {
          toggleComplete(task.id).catch((error) => {
            console.error('Failed to toggle task:', error)
          })
        }}
        className="focus-ring mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border bg-background transition-colors data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
      >
        <Checkbox.Indicator className="text-white">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>

      <div className="flex-1 min-w-0">
        <h3
          onClick={() => setDetailsOpen(true)}
          className={clsx(
            'cursor-pointer text-sm font-medium hover:text-primary-500',
            task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.dueDate && (
            <span
              className={clsx(
                'text-xs',
                isOverdueTask ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground'
              )}
            >
              {formatTaskDate(task.dueDate)}
            </span>
          )}
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              priorityColors[task.priority]
            )}
          >
            {task.priority}
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          deleteTask(task.id).catch((error) => {
            console.error('Failed to delete task:', error)
          })
        }}
        className="focus-ring opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Delete task "${task.title}"`}
      >
        <svg className="h-4 w-4 text-muted-foreground hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <TaskDetailsModal task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </motion.div>
  )
}

