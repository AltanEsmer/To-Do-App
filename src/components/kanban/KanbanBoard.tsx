import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Task, TaskStatus, useTasks } from '../../store/useTasks'
import { KanbanColumn } from './KanbanColumn'
import { KanbanTaskCard } from './KanbanTaskCard'
import { useTranslation } from 'react-i18next'

interface KanbanBoardProps {
  tasks: Task[]
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const { updateTask } = useTasks()
  const { t } = useTranslation()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: t('kanban.todo'), color: 'bg-blue-500' },
    { id: 'in_progress', title: t('kanban.inProgress'), color: 'bg-yellow-500' },
    { id: 'done', title: t('kanban.done'), color: 'bg-green-500' },
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => {
      return tasks.filter((task) => (task.status || 'todo') === status)
    },
    [tasks]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Optional: You can implement live preview updates here if needed
    // For now, we'll just handle the final drop in handleDragEnd
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    // Determine the new status
    let newStatus: TaskStatus | null = null

    // Check if dropped over a column
    const overColumn = COLUMNS.find((col) => col.id === overId)
    if (overColumn) {
      newStatus = overColumn.id
    } else {
      // Dropped over another task - get that task's status
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) {
        newStatus = overTask.status || 'todo'
      }
    }

    // Update if status changed
    if (newStatus && (activeTask.status || 'todo') !== newStatus) {
      try {
        await updateTask(activeId, { 
          status: newStatus,
          completed: newStatus === 'done',
        })
      } catch (error) {
        console.error('Failed to update task status:', error)
        // Optionally show a toast notification here
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksByStatus(column.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanTaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
