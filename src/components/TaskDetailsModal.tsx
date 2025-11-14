import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Edit, Upload, Languages, ChevronDown, ChevronUp, Repeat, Calendar } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Task, useTasks } from '../store/useTasks'
import * as tauriAdapter from '../api/tauriAdapter'
import { isTauri } from '../utils/tauri'
import clsx from 'clsx'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'
import { EditTaskModal } from './EditTaskModal'
import { AttachmentCard } from './ui/AttachmentCard'
import { useToast } from './ui/use-toast'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { TagInput } from './TagInput'
import { RelatedTasksPanel } from './RelatedTasksPanel'
import { TagBadge } from './TagBadge'
import { useTags } from '../store/useTags'
import { getNextOccurrenceDate, formatRecurrencePattern, formatTaskDate } from '../utils/dateHelpers'

interface TaskDetailsModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailsModal({ task, open, onOpenChange }: TaskDetailsModalProps) {
  const { updateTask, getTaskById, syncTasks } = useTasks()
  const { syncTags } = useTags()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [attachments, setAttachments] = useState<tauriAdapter.Attachment[]>([])
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [notificationRepeat, setNotificationRepeat] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(task)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Translation state
  const [translationExpanded, setTranslationExpanded] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState<tauriAdapter.TranslatedContent | null>(null)
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null)
  const [editText, setEditText] = useState('')
  const [targetLang, setTargetLang] = useState<'en' | 'tr'>('tr')

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

  // Refresh task data when tags change
  const handleTagsChange = useCallback(() => {
    if (currentTask) {
      syncTasks().then(() => {
        const updatedTask = getTaskById(currentTask.id)
        if (updatedTask) {
          setCurrentTask(updatedTask)
        }
      })
    }
  }, [currentTask, syncTasks, getTaskById])

  useKeyboardShortcuts({
    onEscape: () => {
      if (open) {
        onOpenChange(false)
      }
    },
    disabled: !open,
  })

  const handleAddAttachment = async (filePath?: string) => {
    if (!currentTask) return
    if (!isTauri()) {
      toast({
        title: 'Not available',
        description: 'Attachments are only available in Tauri desktop app. Use npm run tauri:dev to run the desktop version.',
        variant: 'default',
      })
      return
    }

    let selectedPath = filePath

    if (!selectedPath) {
      try {
        const { open } = await import('@tauri-apps/api/dialog')
        const selected = await open({
          multiple: false,
          title: 'Select file to attach',
          filters: [{
            name: 'Supported Files',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'md']
          }, {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
          }, {
            name: 'PDF',
            extensions: ['pdf']
          }, {
            name: 'Text',
            extensions: ['txt', 'md']
          }]
        })

        if (selected && typeof selected === 'string') {
          selectedPath = selected
        } else {
          return
        }
      } catch (error) {
        console.error('Failed to open file dialog:', error)
        toast({
          title: 'Error',
          description: 'Failed to open file dialog.',
          variant: 'destructive',
        })
        return
      }
    }

    if (selectedPath) {
      setLoading(true)
      try {
        await tauriAdapter.addAttachment(currentTask.id, selectedPath)
        await loadAttachments()
        toast({
          title: 'Success',
          description: 'File attached successfully.',
          variant: 'default',
        })
      } catch (error: any) {
        console.error('Failed to add attachment:', error)
        toast({
          title: 'Error',
          description: error?.message || 'Failed to add attachment.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (!isTauri()) {
      toast({
        title: 'Not available',
        description: 'File input is only available in Tauri desktop app.',
        variant: 'default',
      })
      return
    }

    // For Tauri, we need to use the file dialog instead
    // File input doesn't work well with Tauri's file system
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!isTauri()) {
      toast({
        title: 'Not available',
        description: 'Drag and drop is only available in Tauri desktop app.',
        variant: 'default',
      })
      return
    }

    const files = e.dataTransfer.files
    if (files.length === 0) return

    // In Tauri, we can't directly use File objects from drag-and-drop
    // We need to prompt the user to select files via dialog
    toast({
      title: 'Drag and drop',
      description: 'Please use the "Attach file" button to select files in Tauri mode.',
      variant: 'default',
    })
  }

  const handleDeleteAttachment = async (id: string) => {
    try {
      // Check if this was the background image
      const wasBackground = localStorage.getItem(`task_bg_image_${currentTask?.id}`) === id
      
      await tauriAdapter.deleteAttachment(id)
      await loadAttachments()
      
      // Remove image URL if it exists
      setImageUrls((prev) => {
        const newMap = new Map(prev)
        const url = newMap.get(id)
        if (url) {
          URL.revokeObjectURL(url)
        }
        newMap.delete(id)
        return newMap
      })
      
      // If this was the background image, remove it and notify TaskCard
      if (wasBackground && currentTask) {
        localStorage.removeItem(`task_bg_image_${currentTask.id}`)
        window.dispatchEvent(new CustomEvent('task-background-changed', { detail: { taskId: currentTask.id } }))
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete attachment.',
        variant: 'destructive',
      })
    }
  }

  if (!currentTask) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence mode="wait">
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
                          <h4 className="mb-2 text-sm font-medium text-foreground">{t('task.description')}</h4>
                          <p className="text-sm text-muted-foreground">{currentTask.description}</p>
                        </div>
                      )}

                      {/* Recurrence Section */}
                      {currentTask.recurrenceType !== 'none' && (
                        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-primary-500" />
                            <h4 className="text-sm font-medium text-foreground">Recurrence</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {formatRecurrencePattern(currentTask.recurrenceType, currentTask.recurrenceInterval)}
                            </p>
                            {currentTask.dueDate && getNextOccurrenceDate(currentTask.dueDate, currentTask.recurrenceType, currentTask.recurrenceInterval) && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Next occurrence: {formatTaskDate(getNextOccurrenceDate(currentTask.dueDate, currentTask.recurrenceType, currentTask.recurrenceInterval)!)}
                              </p>
                            )}
                            {currentTask.recurrenceParentId && (
                              <p className="text-xs text-muted-foreground italic">
                                This is a recurring instance
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Translation Section */}
                      <Card className="border-border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Languages className="h-4 w-4" />
                              {t('translation.title')}
                            </CardTitle>
                            <button
                              onClick={() => setTranslationExpanded(!translationExpanded)}
                              className="focus-ring rounded-lg p-1 hover:bg-muted"
                              aria-label={translationExpanded ? 'Collapse translation' : 'Expand translation'}
                            >
                              {translationExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </CardHeader>
                        {translationExpanded && (
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                              <label htmlFor="target-lang" className="text-sm font-medium text-foreground">
                                {t('translation.target')}:
                              </label>
                              <select
                                id="target-lang"
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value as 'en' | 'tr')}
                                className="focus-ring rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                              >
                                <option value="en">English</option>
                                <option value="tr">Türkçe</option>
                              </select>
                              <button
                                onClick={async () => {
                                  if (!currentTask) return
                                  setTranslating(true)
                                  try {
                                    const translated = await tauriAdapter.translateTaskContent(
                                      currentTask.id,
                                      targetLang
                                    )
                                    setTranslation(translated)
                                  } catch (error: any) {
                                    toast({
                                      title: t('translation.error'),
                                      description: error?.message || t('translation.apiKeyMissing'),
                                      variant: 'destructive',
                                    })
                                  } finally {
                                    setTranslating(false)
                                  }
                                }}
                                disabled={translating || !isTauri()}
                                className="focus-ring flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                              >
                                <Languages className="h-4 w-4" />
                                {translating ? t('translation.translating') : t('translation.translate')}
                              </button>
                            </div>

                            {translation && (
                              <div className="space-y-3">
                                {/* Translated Title */}
                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        Title ({t('translation.target')})
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {translation.target_lang.toUpperCase()}
                                      </Badge>
                                    </div>
                                    {editingField !== 'title' && (
                                      <button
                                        onClick={() => {
                                          setEditingField('title')
                                          setEditText(translation.title)
                                        }}
                                        className="focus-ring text-xs text-primary-500 hover:text-primary-600"
                                      >
                                        {t('translation.edit')}
                                      </button>
                                    )}
                                  </div>
                                  {editingField === 'title' ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            if (!currentTask) return
                                            try {
                                              await tauriAdapter.saveTranslationOverride(
                                                currentTask.id,
                                                'title',
                                                targetLang,
                                                editText
                                              )
                                              setTranslation({ ...translation, title: editText })
                                              setEditingField(null)
                                              toast({
                                                title: t('translation.save'),
                                                description: 'Translation saved',
                                                variant: 'default',
                                              })
                                            } catch (error: any) {
                                              toast({
                                                title: t('translation.error'),
                                                description: error?.message || 'Failed to save translation',
                                                variant: 'destructive',
                                              })
                                            }
                                          }}
                                          className="focus-ring rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                                        >
                                          {t('translation.save')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingField(null)
                                            setEditText('')
                                          }}
                                          className="focus-ring rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                                        >
                                          {t('translation.cancel')}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{translation.title}</p>
                                  )}
                                </div>

                                {/* Translated Description */}
                                {translation.description && (
                                  <div>
                                    <div className="mb-2 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">
                                          {t('task.description')} ({t('translation.target')})
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {translation.target_lang.toUpperCase()}
                                        </Badge>
                                      </div>
                                      {editingField !== 'description' && (
                                        <button
                                          onClick={() => {
                                            setEditingField('description')
                                            setEditText(translation.description || '')
                                          }}
                                          className="focus-ring text-xs text-primary-500 hover:text-primary-600"
                                        >
                                          {t('translation.edit')}
                                        </button>
                                      )}
                                    </div>
                                    {editingField === 'description' ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                          rows={4}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={async () => {
                                              if (!currentTask) return
                                              try {
                                                await tauriAdapter.saveTranslationOverride(
                                                  currentTask.id,
                                                  'description',
                                                  targetLang,
                                                  editText
                                                )
                                                setTranslation({ ...translation, description: editText })
                                                setEditingField(null)
                                                toast({
                                                  title: t('translation.save'),
                                                  description: 'Translation saved',
                                                  variant: 'default',
                                                })
                                              } catch (error: any) {
                                                toast({
                                                  title: t('translation.error'),
                                                  description: error?.message || 'Failed to save translation',
                                                  variant: 'destructive',
                                                })
                                              }
                                            }}
                                            className="focus-ring rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                                          >
                                            {t('translation.save')}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingField(null)
                                              setEditText('')
                                            }}
                                            className="focus-ring rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                                          >
                                            {t('translation.cancel')}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">{translation.description}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {!translation && !translating && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                {t('translation.noTranslation')}
                              </p>
                            )}
                          </CardContent>
                        )}
                      </Card>

                      {currentTask.dueDate && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
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

                      {/* Tags Section */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Tags</h4>
                        {currentTask.tags && currentTask.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {currentTask.tags.map((tag) => (
                              <TagBadge key={tag.id} tag={tag} clickable={false} />
                            ))}
                          </div>
                        )}
                        <TagInput
                          taskId={currentTask.id}
                          selectedTags={currentTask.tags || []}
                          onTagsChange={handleTagsChange}
                        />
                      </div>

                      {/* Related Tasks Section */}
                      <div>
                        <RelatedTasksPanel taskId={currentTask.id} />
                      </div>

                      {/* Attachments Section */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Attachments</h4>
                        <div className="space-y-3">
                          {attachments.length > 0 ? (
                            <div className="space-y-2">
                              {attachments.map((attachment) => {
                                const imageUrl = imageUrls.get(attachment.id)
                                const isImageAttachment = isImage(attachment)
                                const isSelectedBackground = localStorage.getItem(`task_bg_image_${currentTask.id}`) === attachment.id
                                
                                return (
                                  <div key={attachment.id} className="relative">
                                    <AttachmentCard
                                      attachment={attachment}
                                      imageUrl={imageUrl}
                                      onDelete={handleDeleteAttachment}
                                      onImageLoad={() => {
                                        console.log('Image loaded:', attachment.filename)
                                      }}
                                    />
                                    {isImageAttachment && (
                                      <button
                                        onClick={() => {
                                          if (isSelectedBackground) {
                                            localStorage.removeItem(`task_bg_image_${currentTask.id}`)
                                            toast({
                                              title: 'Background removed',
                                              description: 'Background image removed. The card will update when you close and reopen it.',
                                              variant: 'default',
                                            })
                                          } else {
                                            localStorage.setItem(`task_bg_image_${currentTask.id}`, attachment.id)
                                            toast({
                                              title: 'Background set',
                                              description: 'Image set as background. The card will update when you close and reopen it.',
                                              variant: 'default',
                                            })
                                          }
                                          // Dispatch custom event to notify TaskCard
                                          window.dispatchEvent(new CustomEvent('task-background-changed', { detail: { taskId: currentTask.id } }))
                                        }}
                                        className={clsx(
                                          'mt-2 w-full text-xs px-2 py-1 rounded border transition-colors',
                                          isSelectedBackground
                                            ? 'bg-primary-500 text-white border-primary-500'
                                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                        )}
                                        aria-label={isSelectedBackground ? 'Remove as background' : 'Set as background'}
                                      >
                                        {isSelectedBackground ? '✓ Set as background' : 'Set as background'}
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No attachments
                            </p>
                          )}
                          
                          {/* File input (hidden, triggered by button) */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                            className="hidden"
                            onChange={handleFileInputChange}
                            aria-label="Attach file (image, PDF, text)"
                          />
                          
                          {/* Drag and drop zone */}
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={clsx(
                              'w-full rounded-lg border border-dashed p-4 text-center transition-colors',
                              isDragging
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-border hover:border-primary-500 hover:bg-muted/30',
                              loading && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <button
                              onClick={() => handleAddAttachment()}
                              disabled={loading}
                              className={clsx(
                                'flex items-center justify-center gap-2 w-full text-sm text-muted-foreground transition-colors hover:text-primary-500',
                                loading && 'opacity-50 cursor-not-allowed'
                              )}
                              aria-label="Attach file (image, PDF, text)"
                            >
                              <Upload className="h-4 w-4" />
                              {loading ? 'Adding...' : 'Attach file (image, PDF, text)'}
                            </button>
                            {isTauri() && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Drag and drop files here (or click to select)
                              </p>
                            )}
                          </div>
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

