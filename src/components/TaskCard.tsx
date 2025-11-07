import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Target } from 'lucide-react'
import { useTasks, Task } from '../store/useTasks'
import { useTimer } from '../store/useTimer'
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
  const { setActiveTask, setMode, startTimer } = useTimer()
  const navigate = useNavigate()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isOverdueTask = task.dueDate && !task.completed && isOverdue(task.dueDate)

  const handleFocus = () => {
    if (task.completed) return
    setActiveTask(task.id)
    setMode('pomodoro')
    navigate('/pomodoro')
    // Small delay to ensure navigation completes before starting timer
    setTimeout(() => {
      startTimer()
    }, 100)
  }

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
      whileHover={{ 
        y: -2,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200',
        'hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/10',
        'dark:hover:border-primary-700 dark:hover:shadow-primary-500/5',
        'hover:bg-card/95',
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
        className="focus-ring mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border bg-background transition-all duration-200 hover:border-primary-400 data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
      >
        <Checkbox.Indicator asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-white"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </motion.div>
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
              'rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-200',
              priorityColors[task.priority]
            )}
          >
            {task.priority}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!task.completed && (
          <motion.button
            onClick={handleFocus}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="focus-ring opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Start Pomodoro for "${task.title}"`}
            title="Start Pomodoro"
          >
            <Target className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary-600" />
          </motion.button>
        )}
        <motion.button
          onClick={() => {
            deleteTask(task.id).catch((error) => {
              console.error('Failed to delete task:', error)
            })
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="focus-ring opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Delete task "${task.title}"`}
        >
          <X className="h-4 w-4 text-muted-foreground transition-colors hover:text-red-600" />
        </motion.button>
      </div>

      <TaskDetailsModal task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </motion.div>
  )
}

