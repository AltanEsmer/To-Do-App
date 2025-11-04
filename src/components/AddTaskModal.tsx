import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { useTasks, TaskPriority, RecurrenceType } from '../store/useTasks'

interface AddTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal component for adding new tasks
 * Includes accessibility features: focus trap, escape key, ARIA labels
 */
export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { addTask } = useTasks()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && titleInputRef.current) {
      // Small delay to ensure animation doesn't interfere
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      await addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        completed: false,
        recurrenceType,
        recurrenceInterval,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('medium')
      setRecurrenceType('none')
      setRecurrenceInterval(1)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add task:', error)
      // Could show an error toast here
    }
  }

  const handleCancel = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    onOpenChange(false)
  }

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
                    <Dialog.Title className="mb-4 text-lg font-semibold text-foreground">
                      Add New Task
                    </Dialog.Title>
                  </div>
                  <div className="px-6 pb-6 flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="task-title" className="mb-1 block text-sm font-medium text-foreground">
                            Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            ref={titleInputRef}
                            id="task-title"
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
                          <label htmlFor="task-description" className="mb-1 block text-sm font-medium text-foreground">
                            Description
                          </label>
                          <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="Add details (optional)"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="task-due-date" className="mb-1 block text-sm font-medium text-foreground">
                              Due Date
                            </label>
                            <input
                              id="task-due-date"
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>

                          <div>
                            <label htmlFor="task-priority" className="mb-1 block text-sm font-medium text-foreground">
                              Priority
                            </label>
                            <select
                              id="task-priority"
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
                          <label htmlFor="task-recurrence" className="mb-1 block text-sm font-medium text-foreground">
                            Recurrence
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              id="task-recurrence"
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
                          Add Task
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

