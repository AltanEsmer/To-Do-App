import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { Task } from '../store/useTasks'
import * as tauriAdapter from '../api/tauriAdapter'
import { isTauri } from '../utils/tauri'
import clsx from 'clsx'

interface TaskDetailsModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailsModal({ task, open, onOpenChange }: TaskDetailsModalProps) {
  const [attachments, setAttachments] = useState<tauriAdapter.Attachment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && task) {
      loadAttachments()
    }
  }, [open, task])

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
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
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

