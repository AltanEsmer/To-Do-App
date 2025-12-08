import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { FileText, Repeat } from 'lucide-react'
import { useTasks, TaskPriority, RecurrenceType } from '../store/useTasks'
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts'
import { TemplatesModal } from './TemplatesModal'
import * as tauriAdapter from '../api/tauriAdapter'
import { getNextOccurrenceDate, formatRecurrencePattern, formatTaskDate } from '../utils/dateHelpers'
import { CreateTaskCommand } from '../commands/taskCommands'
import { commandHistory } from '../utils/commandPattern'
import { logger } from '../services/logger'
import { useTranslation } from 'react-i18next'

interface AddTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal component for adding new tasks
 * Includes accessibility features: focus trap, escape key, ARIA labels
 */
export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const tasksStore = useTasks()
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [notificationRepeat, setNotificationRepeat] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && titleInputRef.current) {
      // Small delay to ensure animation doesn't interfere
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [open])

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
    if (!title.trim()) return
    if (!dueDate) {
      // Show error or prevent submission
      return
    }

    try {
      const command = new CreateTaskCommand(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          completed: false,
          recurrenceType,
          recurrenceInterval,
          reminderMinutesBefore: reminderMinutesBefore || undefined,
          notificationRepeat,
        },
        tasksStore
      )

      await commandHistory.execute(command)

      // Reset form
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('medium')
      setRecurrenceType('none')
      setRecurrenceInterval(1)
      setSelectedTemplateId(null)
      setReminderMinutesBefore(null)
      setNotificationRepeat(false)
      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to add task:', error)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
      setPriority('medium')
      setRecurrenceType('none')
      setRecurrenceInterval(1)
      setSelectedTemplateId(null)
      setReminderMinutesBefore(null)
      setNotificationRepeat(false)
      onOpenChange(false)
  }

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const template = await tauriAdapter.getTemplate(templateId)
      setTitle(template.title)
      setDescription(template.description || '')
      setPriority(template.priority as TaskPriority)
      setSelectedTemplateId(templateId)
      setIsTemplatesOpen(false)
    } catch (error) {
      console.error('Failed to load template:', error)
    }
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
                    <div className="mb-4 flex items-center justify-between">
                      <Dialog.Title className="text-lg font-semibold text-foreground">
                        {t('addTask.title')}
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={() => setIsTemplatesOpen(true)}
                        className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <FileText className="h-4 w-4" />
                        {t('addTask.loadTemplate')}
                      </button>
                    </div>
                    {selectedTemplateId && (
                      <div className="mb-2 rounded-lg bg-primary-100 px-3 py-2 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {t('addTask.templateLoaded')}
                      </div>
                    )}
                  </div>
                  <div className="px-6 pb-6 flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="task-title" className="mb-1 block text-sm font-medium text-foreground">
                            {t('addTask.titleLabel')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            ref={titleInputRef}
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder={t('addTask.titlePlaceholder')}
                            required
                            aria-required="true"
                          />
                        </div>

                        <div>
                          <label htmlFor="task-description" className="mb-1 block text-sm font-medium text-foreground">
                            {t('addTask.descriptionLabel')}
                          </label>
                          <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder={t('addTask.descriptionPlaceholder')}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="task-due-date" className="mb-1 block text-sm font-medium text-foreground">
                              {t('addTask.dueDateLabel')} <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="task-due-date"
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                              required
                              aria-required="true"
                            />
                          </div>

                          <div>
                            <label htmlFor="task-priority" className="mb-1 block text-sm font-medium text-foreground">
                              {t('addTask.priorityLabel')}
                            </label>
                            <select
                              id="task-priority"
                              value={priority}
                              onChange={(e) => setPriority(e.target.value as TaskPriority)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="low">{t('task.priority.low')}</option>
                              <option value="medium">{t('task.priority.medium')}</option>
                              <option value="high">{t('task.priority.high')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Repeat className="h-4 w-4 text-primary-500" />
                            {t('addTask.recurrenceLabel')}
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              id="task-recurrence"
                              value={recurrenceType}
                              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="none">{t('addTask.recurrence.none')}</option>
                              <option value="daily">{t('addTask.recurrence.daily')}</option>
                              <option value="weekly">{t('addTask.recurrence.weekly')}</option>
                              <option value="monthly">{t('addTask.recurrence.monthly')}</option>
                            </select>
                            {recurrenceType !== 'none' && (
                              <input
                                type="number"
                                min="1"
                                value={recurrenceInterval}
                                onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                placeholder={t('addTask.recurrenceInterval')}
                                className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                aria-label={t('addTask.recurrenceInterval')}
                              />
                            )}
                          </div>
                          {recurrenceType !== 'none' && dueDate && (
                            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-950">
                              <p className="text-xs text-primary-600 dark:text-primary-400">
                                {formatRecurrencePattern(recurrenceType, recurrenceInterval)}
                                {getNextOccurrenceDate(new Date(dueDate), recurrenceType, recurrenceInterval) && (
                                  <> • {t('addTask.recurrenceNext')}: {formatTaskDate(getNextOccurrenceDate(new Date(dueDate), recurrenceType, recurrenceInterval)!)}</>
                                )}
                              </p>
                            </div>
                          )}
                          {recurrenceType !== 'none' && !dueDate && (
                            <p className="text-xs text-muted-foreground">
                              {t('addTask.recurrencePreview')}
                            </p>
                          )}
                        </div>

                        {dueDate && (
                          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-foreground">{t('addTask.reminderLabel')}</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setReminderMinutesBefore(null)
                                  setNotificationRepeat(false)
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                {t('addTask.reminderClear')}
                              </button>
                            </div>
                            <div>
                              <label htmlFor="reminder-time" className="mb-1 block text-xs text-muted-foreground">
                                {t('addTask.remindMe')}
                              </label>
                              <select
                                id="reminder-time"
                                value={reminderMinutesBefore || ''}
                                onChange={(e) => setReminderMinutesBefore(e.target.value ? parseInt(e.target.value) : null)}
                                className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                              >
                                <option value="">{t('addTask.noReminder')}</option>
                                <option value="15">{t('addTask.reminder15')}</option>
                                <option value="30">{t('addTask.reminder30')}</option>
                                <option value="60">{t('addTask.reminder60')}</option>
                                <option value="120">{t('addTask.reminder120')}</option>
                                <option value="1440">{t('addTask.reminder1440')}</option>
                              </select>
                            </div>
                            {reminderMinutesBefore && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="notification-repeat"
                                  checked={notificationRepeat}
                                  onChange={(e) => setNotificationRepeat(e.target.checked)}
                                  className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                                />
                                <label htmlFor="notification-repeat" className="text-xs text-muted-foreground">
                                  {t('addTask.reminderRepeat')}
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
                          {t('cancel')}
                        </button>
                        <button
                          type="submit"
                          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                        >
                          {t('addTask.submit')}
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
      <TemplatesModal
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        onUseTemplate={handleLoadTemplate}
      />
    </Dialog.Root>
  )
}

