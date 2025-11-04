import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { useTasks, TaskPriority } from '../store/useTasks'

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
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && titleInputRef.current) {
      // Small delay to ensure animation doesn't interfere
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      completed: false,
    })

    // Reset form
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
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
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl"
                >
                  <Dialog.Title className="mb-4 text-lg font-semibold text-foreground">
                    Add New Task
                  </Dialog.Title>
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
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

