import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '../../store/useTasks'
import { KanbanTaskCard } from './KanbanTaskCard'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

interface KanbanColumnProps {
  column: {
    id: TaskStatus
    title: string
    color: string
  }
  tasks: Task[]
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card/50">
      {/* Column Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border p-4">
        <div className={clsx('h-3 w-3 rounded-full', column.color)} />
        <h2 className="font-semibold text-foreground">{column.title}</h2>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 space-y-3 overflow-y-auto p-4 transition-colors min-h-[200px] scroll-smooth',
          isOver && 'bg-primary-50 dark:bg-primary-950/20'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 transition-colors">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">{t('kanban.dropTaskHere')}</p>
              </div>
            </div>
          ) : (
            tasks.map((task) => <KanbanTaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>
    </div>
  )
}
