import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, Edit } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Task, useTasks } from '../store/useTasks'
import * as tauriAdapter from '../api/tauriAdapter'
import { isTauri } from '../utils/tauri'
import clsx from 'clsx'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'
import { EditTaskModal } from './EditTaskModal'

interface TaskDetailsModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailsModal({ task, open, onOpenChange }: TaskDetailsModalProps) {
  const { updateTask, getTaskById } = useTasks()
  const [attachments, setAttachments] = useState<tauriAdapter.Attachment[]>([])
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [notificationRepeat, setNotificationRepeat] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(task)

  const isImage = (attachment: tauriAdapter.Attachment): boolean => {
    // Check by MIME type
    if (attachment.mime && attachment.mime.startsWith('image/')) {
      return true
    }
    // Check by file extension
    const ext = attachment.filename.split('.').pop()?.toLowerCase()
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico']
    return ext ? imageExtensions.includes(ext) : false
  }

  const getImageUrl = async (attachment: tauriAdapter.Attachment): Promise<string | null> => {
    if (!isTauri()) return null
    try {
      const { appDataDir } = await import('@tauri-apps/api/path')
      const { join } = await import('@tauri-apps/api/path')
      const { readBinaryFile } = await import('@tauri-apps/api/fs')
      const dataDir = await appDataDir()
      const fullPath = await join(dataDir, attachment.path)
      
      console.log('Loading image:', { filename: attachment.filename, path: attachment.path, fullPath })
      
      // Read the file as binary
      const fileData = await readBinaryFile(fullPath)
      
      if (!fileData || fileData.length === 0) {
        console.error('File is empty or could not be read:', fullPath)
        return null
      }
      
      // Determine MIME type
      const mimeType = attachment.mime || 
        (attachment.filename.toLowerCase().endsWith('.png') ? 'image/png' :
         attachment.filename.toLowerCase().endsWith('.gif') ? 'image/gif' :
         attachment.filename.toLowerCase().endsWith('.webp') ? 'image/webp' :
         'image/jpeg')
      
      // Create a blob URL from the binary data
      const blob = new Blob([fileData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      console.log('Created blob URL for image:', attachment.filename)
      return url
    } catch (error) {
      console.error('Failed to get image URL:', error, { attachment })
      return null
    }
  }

  const loadAttachments = useCallback(async () => {
    if (!currentTask) return
    try {
      // Clean up old blob URLs
      setImageUrls((prevUrls) => {
        prevUrls.forEach((url) => {
          URL.revokeObjectURL(url)
        })
        return new Map()
      })
      
      const atts = await tauriAdapter.getAttachments(currentTask.id)
      setAttachments(atts)
      
      // Load image URLs for image attachments
      const urlMap = new Map<string, string>()
      for (const att of atts) {
        if (isImage(att)) {
          const url = await getImageUrl(att)
          if (url) {
            urlMap.set(att.id, url)
          }
        }
      }
      setImageUrls(urlMap)
    } catch (error) {
      console.error('Failed to load attachments:', error)
    }
  }, [currentTask])

  // Update current task when task prop changes
  useEffect(() => {
    setCurrentTask(task)
  }, [task])

  useEffect(() => {
    if (open && currentTask) {
      loadAttachments()
      setReminderMinutesBefore(currentTask.reminderMinutesBefore || null)
      setNotificationRepeat(currentTask.notificationRepeat || false)
    }
  }, [open, currentTask, loadAttachments])

  // Cleanup blob URLs when component unmounts or modal closes
  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [imageUrls])

  // Refresh task data when edit modal closes
  useEffect(() => {
    if (!editModalOpen && open && currentTask) {
      // Get the latest task from the store
      const updatedTask = getTaskById(currentTask.id)
      if (updatedTask) {
        setCurrentTask(updatedTask)
        setReminderMinutesBefore(updatedTask.reminderMinutesBefore || null)
        setNotificationRepeat(updatedTask.notificationRepeat || false)
      }
      // Reload attachments
      loadAttachments()
    }
  }, [editModalOpen, open, currentTask, getTaskById, loadAttachments])

  useKeyboardShortcuts({
    onEscape: () => {
      if (open) {
        onOpenChange(false)
      }
    },
    disabled: !open,
  })

  const handleAddAttachment = async () => {
    if (!currentTask) return
    if (!isTauri()) {
      alert('Attachments are only available in Tauri desktop app. Use npm run tauri:dev to run the desktop version.')
      return
    }
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      const selected = await open({
        multiple: false,
        title: 'Select image to attach',
        filters: [{
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
        }]
      })

      if (selected && typeof selected === 'string') {
        setLoading(true)
        try {
          await tauriAdapter.addAttachment(currentTask.id, selected)
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

  if (!currentTask) return null

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
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-lg font-semibold text-foreground">
                        {currentTask.title}
                      </Dialog.Title>
                      <button
                        onClick={() => {
                          setEditModalOpen(true)
                        }}
                        className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        aria-label="Edit task"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                      {currentTask.description && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-foreground">Description</h4>
                          <p className="text-sm text-muted-foreground">{currentTask.description}</p>
                        </div>
                      )}

                      {currentTask.dueDate && (
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
                                  if (currentTask) {
                                    updateTask(currentTask.id, {
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
                                    if (currentTask) {
                                      updateTask(currentTask.id, {
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
                        <div className="space-y-3">
                          {attachments.filter(isImage).length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {attachments.filter(isImage).map((attachment) => {
                                const imageUrl = imageUrls.get(attachment.id)
                                return (
                                  <div
                                    key={attachment.id}
                                    className="relative group rounded-lg border border-border bg-background overflow-hidden"
                                  >
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={attachment.filename}
                                        className="w-full h-32 object-cover cursor-pointer bg-muted"
                                        onClick={() => handleOpenAttachment(attachment)}
                                        onError={(e) => {
                                          console.error('Image failed to load:', imageUrl, attachment)
                                          e.currentTarget.style.display = 'none'
                                        }}
                                        onLoad={() => {
                                          console.log('Image loaded successfully:', attachment.filename)
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-32 flex items-center justify-center bg-muted">
                                        <span className="text-xs text-muted-foreground">Loading...</span>
                                      </div>
                                    )}
                                    <button
                                      onClick={() => handleDeleteAttachment(attachment.id)}
                                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                      aria-label={`Delete ${attachment.filename}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                      <p className="text-xs text-white truncate">{attachment.filename}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No images attached
                            </p>
                          )}
                          <button
                            onClick={handleAddAttachment}
                            disabled={loading}
                            className={clsx(
                              'w-full rounded-lg border border-dashed border-border p-2 text-sm text-muted-foreground transition-colors hover:border-primary-500 hover:text-primary-500',
                              loading && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {loading ? 'Adding...' : '+ Add Image'}
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
      <EditTaskModal
        task={currentTask}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </Dialog.Root>
  )
}

