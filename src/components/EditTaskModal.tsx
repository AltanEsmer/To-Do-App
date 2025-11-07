import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { useTasks, Task, TaskPriority, RecurrenceType } from '../store/useTasks'
import { useProjects } from '../store/useProjects'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'

interface EditTaskModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal component for editing existing tasks
 * Includes accessibility features: focus trap, escape key, ARIA labels
 */
export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
  const { updateTask } = useTasks()
  const { projects } = useProjects()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [projectId, setProjectId] = useState<string>('')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [notificationRepeat, setNotificationRepeat] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Initialize form with task data when modal opens or task changes
  useEffect(() => {
    if (task && open) {
      setTitle(task.title)
      setDescription(task.description || '')
      setDueDate(task.dueDate ? task.dueDate.toISOString().split('T')[0] : '')
      setPriority(task.priority)
      setProjectId(task.projectId || '')
      setRecurrenceType(task.recurrenceType)
      setRecurrenceInterval(task.recurrenceInterval)
      setReminderMinutesBefore(task.reminderMinutesBefore || null)
      setNotificationRepeat(task.notificationRepeat || false)
      
      // Focus title input after a small delay
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [task, open])

  useKeyboardShortcuts({
    onEnter: () => {
      if (open && title.trim()) {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent)
      }
    },
    onEscape: () => {
      if (open) {
        handleCancel()
      }
    },
    disabled: !open,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !title.trim()) return

    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        projectId: projectId || undefined,
        recurrenceType,
        recurrenceInterval,
        reminderMinutesBefore: reminderMinutesBefore || undefined,
        notificationRepeat,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update task:', error)
      // Could show an error toast here
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!task) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: '-45%' }}
                  animate={{ opacity: 1, scale: 1, y: '-50%' }}
                  exit={{ opacity: 0, scale: 0.95, y: '-45%' }}
                  className="fixed z-50 w-full rounded-2xl border border-border bg-card shadow-xl flex flex-col"
                  style={{ 
                    left: '50%',
                    top: '50%',
                    x: '-50%',
                    maxHeight: 'calc(100vh - 3rem)',
                    maxWidth: '28rem',
                    width: '90%'
                  }}
                >
                  <div className="p-6 flex-shrink-0">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      Edit Task
                    </Dialog.Title>
                  </div>
                  <div className="px-6 pb-6 flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="edit-task-title" className="mb-1 block text-sm font-medium text-foreground">
                            Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            ref={titleInputRef}
                            id="edit-task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="Enter task title"
                            required
                            aria-required="true"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-task-description" className="mb-1 block text-sm font-medium text-foreground">
                            Description
                          </label>
                          <textarea
                            id="edit-task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="Add details (optional)"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="edit-task-due-date" className="mb-1 block text-sm font-medium text-foreground">
                              Due Date
                            </label>
                            <input
                              id="edit-task-due-date"
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>

                          <div>
                            <label htmlFor="edit-task-priority" className="mb-1 block text-sm font-medium text-foreground">
                              Priority
                            </label>
                            <select
                              id="edit-task-priority"
                              value={priority}
                              onChange={(e) => setPriority(e.target.value as TaskPriority)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="edit-task-project" className="mb-1 block text-sm font-medium text-foreground">
                            Project
                          </label>
                          <select
                            id="edit-task-project"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          >
                            <option value="">No Project</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="edit-task-recurrence" className="mb-1 block text-sm font-medium text-foreground">
                            Recurrence
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              id="edit-task-recurrence"
                              value={recurrenceType}
                              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="none">None</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                            {recurrenceType !== 'none' && (
                              <input
                                type="number"
                                min="1"
                                value={recurrenceInterval}
                                onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                placeholder="Interval"
                                className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                aria-label="Recurrence interval"
                              />
                            )}
                          </div>
                          {recurrenceType !== 'none' && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Repeats every {recurrenceInterval} {recurrenceType === 'daily' ? 'day' : recurrenceType === 'weekly' ? 'week' : 'month'}{recurrenceInterval > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        {dueDate && (
                          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-foreground">Notification Reminder</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setReminderMinutesBefore(null)
                                  setNotificationRepeat(false)
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                Clear
                              </button>
                            </div>
                            <div>
                              <label htmlFor="edit-reminder-time" className="mb-1 block text-xs text-muted-foreground">
                                Remind me
                              </label>
                              <select
                                id="edit-reminder-time"
                                value={reminderMinutesBefore || ''}
                                onChange={(e) => setReminderMinutesBefore(e.target.value ? parseInt(e.target.value) : null)}
                                className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                              >
                                <option value="">No reminder</option>
                                <option value="15">15 minutes before</option>
                                <option value="30">30 minutes before</option>
                                <option value="60">1 hour before</option>
                                <option value="120">2 hours before</option>
                                <option value="1440">1 day before</option>
                              </select>
                            </div>
                            {reminderMinutesBefore && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="edit-notification-repeat"
                                  checked={notificationRepeat}
                                  onChange={(e) => setNotificationRepeat(e.target.checked)}
                                  className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                                />
                                <label htmlFor="edit-notification-repeat" className="text-xs text-muted-foreground">
                                  Repeat reminder daily until completed
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

