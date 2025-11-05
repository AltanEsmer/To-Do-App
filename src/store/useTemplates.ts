import { create } from 'zustand'
import * as tauriAdapter from '../api/tauriAdapter'

export interface Template {
  id: string
  name: string
  title: string
  description?: string
  priority: string
  project_id?: string
  recurrence_type?: string
  created_at: number
  updated_at: number
}

interface TemplatesState {
  templates: Template[]
  loading: boolean
  error: string | null
  loadTemplates: () => Promise<void>
  createTemplate: (template: Omit<Template, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  createTaskFromTemplate: (templateId: string, dueDate?: Date) => Promise<void>
}

export const useTemplates = create<TemplatesState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  loadTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const templates = await tauriAdapter.getTemplates()
      set({ templates, loading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load templates', loading: false })
    }
  },

  createTemplate: async (template) => {
    set({ loading: true, error: null })
    try {
      await tauriAdapter.createTemplate({
        name: template.name,
        title: template.title,
        description: template.description,
        priority: template.priority,
        project_id: template.project_id,
        recurrence_type: template.recurrence_type,
      })
      await get().loadTemplates()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create template', loading: false })
      throw error
    }
  },

  updateTemplate: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      await tauriAdapter.updateTemplate(id, {
        name: updates.name,
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        project_id: updates.project_id,
        recurrence_type: updates.recurrence_type,
      })
      await get().loadTemplates()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update template', loading: false })
      throw error
    }
  },

  deleteTemplate: async (id) => {
    set({ loading: true, error: null })
    try {
      await tauriAdapter.deleteTemplate(id)
      await get().loadTemplates()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete template', loading: false })
      throw error
    }
  },

  createTaskFromTemplate: async (templateId, dueDate) => {
    set({ loading: true, error: null })
    try {
      const dueDateTimestamp = dueDate ? Math.floor(dueDate.getTime() / 1000) : undefined
      await tauriAdapter.createTaskFromTemplate(templateId, dueDateTimestamp)
      set({ loading: false })
      // Refresh tasks will be handled by the calling component
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task from template', loading: false })
      throw error
    }
  },
}))

