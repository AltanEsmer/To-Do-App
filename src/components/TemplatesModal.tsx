import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Edit2, Trash2, Check } from 'lucide-react'
import { useTemplates } from '../store/useTemplates'
import { useProjects } from '../store/useProjects'
import clsx from 'clsx'

interface TemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseTemplate?: (templateId: string) => void
}

export function TemplatesModal({ open, onOpenChange, onUseTemplate }: TemplatesModalProps) {
  const { templates, loading, loadTemplates, createTemplate, updateTemplate, deleteTemplate } =
    useTemplates()
  const { projects } = useProjects()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    project_id: '',
  })

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleCreate = async () => {
    try {
      await createTemplate({
        name: formData.name,
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        project_id: formData.project_id || undefined,
      })
      resetForm()
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await updateTemplate(id, {
        name: formData.name,
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        project_id: formData.project_id || undefined,
      })
      resetForm()
      setEditingId(null)
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(id)
      } catch (error) {
        console.error('Failed to delete template:', error)
      }
    }
  }

  const handleUseTemplate = async (templateId: string) => {
    if (onUseTemplate) {
      onUseTemplate(templateId)
      onOpenChange(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      priority: 'medium',
      project_id: '',
    })
  }

  const startEdit = (template: typeof templates[0]) => {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      title: template.title,
      description: template.description || '',
      priority: template.priority as 'low' | 'medium' | 'high',
      project_id: template.project_id || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    resetForm()
  }

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return 'No Project'
    return projects.find((p) => p.id === projectId)?.name || 'Unknown Project'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
      case 'low':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" asChild>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content
              className="fixed z-50 w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none"
              asChild
              aria-describedby={undefined}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: '-45%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-45%' }}
                transition={{ duration: 0.2 }}
                style={{
                  left: '50%',
                  top: '50%',
                  x: '-50%',
                }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-2xl font-bold text-foreground">
                      Task Templates
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                      Create and manage reusable task templates to quickly add common tasks.
                    </Dialog.Description>
                  </div>
                  <div className="flex gap-2">
                    {!isCreating && !editingId && (
                      <button
                        onClick={() => setIsCreating(true)}
                        className="focus-ring flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                      >
                        <Plus className="h-4 w-4" />
                        New Template
                      </button>
                    )}
                    <Dialog.Close asChild>
                      <button
                        className="focus-ring rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {(isCreating || editingId) && (
                  <div className="mb-6 rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                      {isCreating ? 'Create New Template' : 'Edit Template'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Template Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          placeholder="e.g., Weekly Review"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Task Title
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          placeholder="Task title"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          placeholder="Task description (optional)"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">
                            Priority
                          </label>
                          <select
                            value={formData.priority}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                priority: e.target.value as 'low' | 'medium' | 'high',
                              })
                            }
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">
                            Project
                          </label>
                          <select
                            value={formData.project_id}
                            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
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
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (isCreating) {
                              handleCreate()
                            } else if (editingId) {
                              handleUpdate(editingId)
                            }
                          }}
                          disabled={!formData.name.trim() || !formData.title.trim()}
                          className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                        >
                          {isCreating ? 'Create' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                  {loading && templates.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">Loading templates...</div>
                  ) : templates.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No templates yet. Create your first template to get started!
                    </div>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-lg border border-border bg-background p-4"
                      >
                        {editingId === template.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdate(template.id)}
                                className="focus-ring rounded-lg bg-primary-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="focus-ring rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">{template.name}</h4>
                                  <span
                                    className={clsx(
                                      'rounded px-2 py-0.5 text-xs font-medium',
                                      getPriorityColor(template.priority)
                                    )}
                                  >
                                    {template.priority}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{template.title}</p>
                                {template.description && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {template.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Project: {getProjectName(template.project_id)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {onUseTemplate && (
                                  <button
                                    onClick={() => handleUseTemplate(template.id)}
                                    className="focus-ring rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-primary-900/30"
                                    aria-label="Use template"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => startEdit(template)}
                                  className="focus-ring rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                                  aria-label="Edit template"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(template.id)}
                                  className="focus-ring rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                                  aria-label="Delete template"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  )
}

