import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Repeat } from 'lucide-react'
import { useTasks, Task, TaskPriority, RecurrenceType } from '../store/useTasks'
import { useProjects } from '../store/useProjects'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'
import { getNextOccurrenceDate, formatRecurrencePattern, formatTaskDate } from '../utils/dateHelpers'
import { UpdateTaskCommand } from '../commands/taskCommands'
import { commandHistory } from '../utils/commandPattern'
import { logger } from '../services/logger'

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
  const tasksStore = useTasks()
  const { projects, addProject, syncProjects } = useProjects()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [projectId, setProjectId] = useState<string>('')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [notificationRepeat, setNotificationRepeat] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const projectNameInputRef = useRef<HTMLInputElement>(null)

  // Sync projects when modal opens
  useEffect(() => {
    if (open) {
      syncProjects()
    }
  }, [open, syncProjects])

  // Initialize form with task data when modal opens or task changes
  useEffect(() => {
    if (task && open) {
      setTitle(task.title)
      setDescription(task.description || '')
      if (task.dueDate) {
        const dateStr = task.dueDate.toISOString().split('T')[0]
        if (dateStr) {
          setDueDate(dateStr)
        }
      } else {
        setDueDate('')
      }
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
      const command = new UpdateTaskCommand(
        task.id,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          projectId: projectId || undefined,
          recurrenceType,
          recurrenceInterval,
          reminderMinutesBefore: reminderMinutesBefore || undefined,
          notificationRepeat,
        },
        tasksStore
      )

      await commandHistory.execute(command)

      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to update task:', error)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    try {
      const newProject = await addProject({
        name: newProjectName.trim(),
        color: undefined, // Optional color, can be added later
      })
      setProjectId(newProject.id)
      setNewProjectName('')
      setIsCreateProjectOpen(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleCancelCreateProject = () => {
    setNewProjectName('')
    setIsCreateProjectOpen(false)
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
              <Dialog.Content asChild aria-describedby={undefined}>
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
                          <div className="mb-1 flex items-center justify-between">
                            <label htmlFor="edit-task-project" className="block text-sm font-medium text-foreground">
                              Project
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsCreateProjectOpen(true)}
                              className="focus-ring flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            >
                              <Plus className="h-3 w-3" />
                              New Project
                            </button>
                          </div>
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            Projects help organize related tasks together
                          </p>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Repeat className="h-4 w-4 text-primary-500" />
                            Recurrence
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              id="edit-task-recurrence"
                              value={recurrenceType}
                              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="none">No recurrence</option>
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
                          {recurrenceType !== 'none' && dueDate && (
                            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-950">
                              <p className="text-xs text-primary-600 dark:text-primary-400">
                                {formatRecurrencePattern(recurrenceType, recurrenceInterval)}
                                {getNextOccurrenceDate(new Date(dueDate), recurrenceType, recurrenceInterval) && (
                                  <> • Next: {formatTaskDate(getNextOccurrenceDate(new Date(dueDate), recurrenceType, recurrenceInterval)!)}</>
                                )}
                              </p>
                            </div>
                          )}
                          {recurrenceType !== 'none' && !dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Set a due date to preview recurrence pattern
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

      {/* Create Project Dialog */}
      <Dialog.Root open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <Dialog.Portal>
          <AnimatePresence>
            {isCreateProjectOpen && (
              <>
                <Dialog.Overlay asChild>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/50"
                  />
                </Dialog.Overlay>
                <Dialog.Content
                  className="fixed z-[60] w-full rounded-2xl border border-border bg-card shadow-xl p-0"
                  aria-describedby={undefined}
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    maxWidth: '24rem',
                    width: '90%',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6"
                  >
                    <Dialog.Title className="mb-2 text-lg font-semibold text-foreground">
                      Create New Project
                    </Dialog.Title>
                    <Dialog.Description className="mb-4 text-sm text-muted-foreground">
                      Create a new project to organize related tasks together.
                    </Dialog.Description>
                    <form onSubmit={handleCreateProject}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="new-project-name" className="mb-1 block text-sm font-medium text-foreground">
                            Project Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            ref={projectNameInputRef}
                            id="new-project-name"
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="Enter project name"
                            required
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleCancelCreateProject}
                          className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </Dialog.Content>
              </>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  )
}

