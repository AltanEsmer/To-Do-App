import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Target, Link2, Repeat, Calendar, Lock } from 'lucide-react'
import { useTasks, Task } from '../store/useTasks'
import { useTimer } from '../store/useTimer'
import { formatTaskDate, isOverdue, getNextOccurrenceDate, formatRecurrencePattern } from '../utils/dateHelpers'
import { TaskDetailsModal } from './TaskDetailsModal'
import clsx from 'clsx'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as tauriAdapter from '../api/tauriAdapter'
import { isTauri } from '../utils/tauri'
import { TagBadge } from './TagBadge'

interface TaskCardProps {
  task: Task
}

/**
 * Task card component with checkbox, title, due date, and priority indicator
 */
export function TaskCard({ task }: TaskCardProps) {
  const { toggleComplete, deleteTask, getRelatedTasks, checkIsBlocked, getBlockingTasks } = useTasks()
  const { setActiveTask, setMode, startTimer } = useTimer()
  const navigate = useNavigate()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [hasRelatedTasks, setHasRelatedTasks] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockingTasksCount, setBlockingTasksCount] = useState(0)
  const isOverdueTask = task.dueDate && !task.completed && isOverdue(task.dueDate)

  // Load background image attachment
  useEffect(() => {
    if (!isTauri() || !task.id) return

    const loadBackgroundImage = async () => {
      // Clear existing background
      if (backgroundImageUrl) {
        URL.revokeObjectURL(backgroundImageUrl)
        setBackgroundImageUrl(null)
      }
      try {
        const attachments = await tauriAdapter.getAttachments(task.id)
        const imageAttachments = attachments.filter((att) => {
          if (att.mime && att.mime.startsWith('image/')) return true
          const ext = att.filename.split('.').pop()?.toLowerCase()
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext || '')
        })

        if (imageAttachments.length > 0) {
          // Check if a specific image is selected as background
          const selectedImageId = localStorage.getItem(`task_bg_image_${task.id}`)
          const selectedImage = selectedImageId 
            ? imageAttachments.find(att => att.id === selectedImageId)
            : null
          
          // Use selected image or first image
          const imageToUse = selectedImage || imageAttachments[0]
          try {
            const { appDataDir } = await import('@tauri-apps/api/path')
            const { join } = await import('@tauri-apps/api/path')
            const { readBinaryFile } = await import('@tauri-apps/api/fs')
            const dataDir = await appDataDir()
            const fullPath = await join(dataDir, imageToUse.path)
            const fileData = await readBinaryFile(fullPath)
            
            if (fileData && fileData.length > 0) {
              const mimeType = imageToUse.mime || 
                (imageToUse.filename.toLowerCase().endsWith('.png') ? 'image/png' :
                 imageToUse.filename.toLowerCase().endsWith('.gif') ? 'image/gif' :
                 imageToUse.filename.toLowerCase().endsWith('.webp') ? 'image/webp' :
                 'image/jpeg')
              const blob = new Blob([fileData], { type: mimeType })
              const url = URL.createObjectURL(blob)
              setBackgroundImageUrl(url)
            }
          } catch (error) {
            console.error('Failed to load background image:', error)
          }
        }
      } catch (error) {
        console.error('Failed to load attachments:', error)
      }
    }

    loadBackgroundImage()

    // Listen for background change events
    const handleBackgroundChange = (e: CustomEvent) => {
      if (e.detail.taskId === task.id) {
        loadBackgroundImage()
      }
    }
    window.addEventListener('task-background-changed', handleBackgroundChange as EventListener)

    // Cleanup blob URL on unmount or when task changes
    return () => {
      window.removeEventListener('task-background-changed', handleBackgroundChange as EventListener)
      if (backgroundImageUrl) {
        URL.revokeObjectURL(backgroundImageUrl)
        setBackgroundImageUrl(null)
      }
    }
  }, [task.id])

  // Check if task has relationships
  useEffect(() => {
    const checkRelationships = async () => {
      try {
        const related = await getRelatedTasks(task.id)
        setHasRelatedTasks(related.length > 0)
      } catch (error) {
        console.error('Failed to check relationships:', error)
      }
    }
    checkRelationships()
  }, [task.id, getRelatedTasks])

  // Check if task is blocked
  useEffect(() => {
    const checkBlockingStatus = async () => {
      try {
        const blocked = await checkIsBlocked(task.id)
        setIsBlocked(blocked)
        if (blocked) {
          const blockingTasks = await getBlockingTasks(task.id)
          const incompleteBlocking = blockingTasks.filter(t => !t.completed)
          setBlockingTasksCount(incompleteBlocking.length)
        } else {
          setBlockingTasksCount(0)
        }
      } catch (error) {
        console.error('Failed to check blocking status:', error)
      }
    }
    checkBlockingStatus()
  }, [task.id, task.completed, checkIsBlocked, getBlockingTasks])

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
        'group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 relative overflow-hidden',
        'hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/10',
        'dark:hover:border-primary-700 dark:hover:shadow-primary-500/5',
        'hover:bg-card/95',
        task.completed && 'opacity-60'
      )}
      style={{
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background overlay for text readability */}
      {backgroundImageUrl && (
        <div className="absolute inset-0 bg-card/70 dark:bg-card/80" />
      )}
      
      {/* Content with relative positioning */}
      <div className="relative z-10 flex items-start gap-3 w-full">
      <Checkbox.Root
        checked={task.completed}
        disabled={isBlocked && !task.completed}
        onCheckedChange={() => {
          if (isBlocked && !task.completed) {
            console.warn(`Cannot complete task "${task.title}": blocked by ${blockingTasksCount} incomplete task(s)`)
            alert(`This task is blocked by ${blockingTasksCount} incomplete task(s). Complete the blocking tasks first.`)
            return
          }
          toggleComplete(task.id).catch((error) => {
            console.error('Failed to toggle task:', error)
          })
        }}
        className={clsx(
          "focus-ring mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border bg-background transition-all duration-200",
          isBlocked && !task.completed
            ? "cursor-not-allowed opacity-50"
            : "hover:border-primary-400 data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
        )}
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
          {task.recurrenceType !== 'none' && (
            <div className="flex items-center gap-1.5">
              <Repeat className="h-3 w-3 text-primary-500" />
              <span className="text-xs text-primary-600 dark:text-primary-400">
                {formatRecurrencePattern(task.recurrenceType, task.recurrenceInterval)}
              </span>
              {task.dueDate && getNextOccurrenceDate(task.dueDate, task.recurrenceType, task.recurrenceInterval) && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Next: {formatTaskDate(getNextOccurrenceDate(task.dueDate, task.recurrenceType, task.recurrenceInterval)!)}
                  </span>
                </>
              )}
            </div>
          )}
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-200',
              priorityColors[task.priority]
            )}
          >
            {task.priority}
          </span>
          {hasRelatedTasks && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Has related tasks">
              <Link2 className="h-3 w-3" />
            </span>
          )}
          {isBlocked && !task.completed && (
            <span 
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
              title={`Blocked by ${blockingTasksCount} incomplete task(s)`}
            >
              <Lock className="h-3 w-3" />
              <span>Blocked ({blockingTasksCount})</span>
            </span>
          )}
        </div>
        {task.tags && task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} tag={tag} clickable={false} />
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>
            )}
          </div>
        )}
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
      </div>

      <TaskDetailsModal task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </motion.div>
  )
}

