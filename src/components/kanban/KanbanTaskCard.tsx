import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Calendar, Tag, User, GripVertical, AlertCircle } from 'lucide-react'
import { Task } from '../../store/useTasks'
import { TaskDetailsModal } from '../TaskDetailsModal'
import { formatTaskDate, isOverdue } from '../../utils/dateHelpers'
import clsx from 'clsx'

interface KanbanTaskCardProps {
  task: Task
  isDragging?: boolean
}

export function KanbanTaskCard({ task, isDragging = false }: KanbanTaskCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    low: 'border-l-blue-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-red-500',
  }

  const isOverdueTask = task.dueDate && !task.completed && isOverdue(task.dueDate)

  const handleContentClick = (_e: React.MouseEvent) => {
    if (!detailsOpen) {
      setDetailsOpen(true)
    }
  }

  const cardContent = (
    <div
      className={clsx(
        'group rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md',
        'border-l-4',
        priorityColors[task.priority],
        (isDragging || isSortableDragging) && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <div
          className="mt-1 cursor-grab text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-2 cursor-pointer" onClick={handleContentClick}>
          <h3 className="font-medium text-foreground line-clamp-2">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.dueDate && (
              <div
                className={clsx(
                  'flex items-center gap-1',
                  isOverdueTask && 'font-semibold text-red-600 dark:text-red-400'
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatTaskDate(task.dueDate)}
              </div>
            )}
            {isOverdueTask && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                Overdue
              </div>
            )}
            {task.projectId && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Project
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag.name}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const modalJSX = <TaskDetailsModal task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />

  if (isDragging) {
    return (
      <>
        <div className="rounded-lg border border-border bg-card p-3 opacity-50">
          {task.title}
        </div>
        {modalJSX}
      </>
    )
  }

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        layout
      >
        {cardContent}
      </motion.div>
      {modalJSX}
    </>
  )
}
