import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Task, useTasks } from '../store/useTasks'
import * as tauriAdapter from '../api/tauriAdapter'
import { isTauri } from '../utils/tauri'
import clsx from 'clsx'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'

interface TaskDetailsModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailsModal({ task, open, onOpenChange }: TaskDetailsModalProps) {
  const { updateTask } = useTasks()
  const [attachments, setAttachments] = useState<tauriAdapter.Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [notificationRepeat, setNotificationRepeat] = useState(false)

  useEffect(() => {
    if (open && task) {
      loadAttachments()
      setReminderMinutesBefore(task.reminderMinutesBefore || null)
      setNotificationRepeat(task.notificationRepeat || false)
    }
  }, [open, task])

  useKeyboardShortcuts({
    onEscape: () => {
      if (open) {
        onOpenChange(false)
      }
    },
    disabled: !open,
  })

  const loadAttachments = async () => {
    if (!task) return
    try {
      const atts = await tauriAdapter.getAttachments(task.id)
      setAttachments(atts)
    } catch (error) {
      console.error('Failed to load attachments:', error)
    }
  }

  const handleAddAttachment = async () => {
    if (!task) return
    if (!isTauri()) {
      alert('Attachments are only available in Tauri desktop app. Use npm run tauri:dev to run the desktop version.')
      return
    }
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      const selected = await open({
        multiple: false,
        title: 'Select file to attach',
      })

      if (selected && typeof selected === 'string') {
        setLoading(true)
        try {
          await tauriAdapter.addAttachment(task.id, selected)
          await loadAttachments()
        } catch (error) {
          console.error('Failed to add attachment:', error)
        } finally {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error)
    }
  }

  const handleDeleteAttachment = async (id: string) => {
    try {
      await tauriAdapter.deleteAttachment(id)
      await loadAttachments()
    } catch (error) {
      console.error('Failed to delete attachment:', error)
    }
  }

  const handleOpenAttachment = async (attachment: tauriAdapter.Attachment) => {
    if (!isTauri()) {
      alert('Opening attachments is only available in Tauri desktop app.')
      return
    }
    try {
      const { appDataDir } = await import('@tauri-apps/api/path')
      const { join } = await import('@tauri-apps/api/path')
      const { open: openPath } = await import('@tauri-apps/api/shell')
      const dataDir = await appDataDir()
      const fullPath = await join(dataDir, attachment.path)
      await openPath(fullPath)
    } catch (error) {
      console.error('Failed to open attachment:', error)
    }
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
                    maxWidth: '32rem',
                    width: '90%'
                  }}
                >
                  <div className="p-6 flex-shrink-0 border-b border-border">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {task.title}
                    </Dialog.Title>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                      {task.description && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-foreground">Description</h4>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                      )}

                      {task.dueDate && (
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">Notification Reminder</h4>
                          </div>
                          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                            <div>
                              <label htmlFor="task-reminder-time" className="mb-1 block text-xs text-muted-foreground">
                                Remind me
                              </label>
                              <select
                                id="task-reminder-time"
                                value={reminderMinutesBefore || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? parseInt(e.target.value) : null
                                  setReminderMinutesBefore(value)
                                  if (task) {
                                    updateTask(task.id, {
                                      reminderMinutesBefore: value || undefined,
                                      notificationRepeat: value ? notificationRepeat : false,
                                    }).catch(console.error)
                                  }
                                }}
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
                                  id="task-notification-repeat"
                                  checked={notificationRepeat}
                                  onChange={(e) => {
                                    setNotificationRepeat(e.target.checked)
                                    if (task) {
                                      updateTask(task.id, {
                                        notificationRepeat: e.target.checked,
                                      }).catch(console.error)
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                                />
                                <label htmlFor="task-notification-repeat" className="text-xs text-muted-foreground">
                                  Repeat reminder daily until completed
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="mb-2 text-sm font-medium text-foreground">Attachments</h4>
                        <div className="space-y-2">
                          {attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between rounded-lg border border-border bg-background p-2"
                            >
                              <button
                                onClick={() => handleOpenAttachment(attachment)}
                                className="flex-1 text-left text-sm text-foreground hover:text-primary-500"
                              >
                                {attachment.filename}
                              </button>
                              <button
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="ml-2 text-red-600 hover:text-red-700"
                                aria-label={`Delete ${attachment.filename}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleAddAttachment}
                            disabled={loading}
                            className={clsx(
                              'w-full rounded-lg border border-dashed border-border p-2 text-sm text-muted-foreground transition-colors hover:border-primary-500 hover:text-primary-500',
                              loading && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {loading ? 'Adding...' : '+ Add Attachment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-shrink-0 border-t border-border flex justify-end">
                    <button
                      onClick={() => onOpenChange(false)}
                      className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Close
                    </button>
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

