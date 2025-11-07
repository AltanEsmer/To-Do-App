import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tauriAdapter from '../api/tauriAdapter'

export interface Project {
  id: string
  name: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

interface ProjectsState {
  projects: Project[]
  loading: boolean
  error: string | null
  syncProjects: () => Promise<void>
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getProjectById: (id: string) => Project | undefined
}

// Convert Rust Project to frontend Project
function convertProject(project: tauriAdapter.Project): Project {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    createdAt: new Date(project.created_at * 1000),
    updatedAt: new Date(project.updated_at * 1000),
  }
}

export const useProjects = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      loading: false,
      error: null,

      syncProjects: async () => {
    set({ loading: true, error: null })
    try {
      const rustProjects = await tauriAdapter.getProjects()
      const projects = rustProjects.map(convertProject)
      set({ projects, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sync projects',
        loading: false,
      })
    }
  },

  addProject: async (projectData) => {
    try {
      const rustProject = await tauriAdapter.createProject({
        name: projectData.name,
        color: projectData.color,
      })
      const newProject = convertProject(rustProject)
      set((state) => ({
        projects: [...state.projects, newProject],
      }))
      return newProject
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
      })
      throw error
    }
  },

  updateProject: async (id, updates) => {
    try {
      const rustProject = await tauriAdapter.updateProject(id, {
        name: updates.name,
        color: updates.color,
      })
      const updatedProject = convertProject(rustProject)
      set((state) => ({
        projects: state.projects.map((project) => (project.id === id ? updatedProject : project)),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
      })
      throw error
    }
  },

  deleteProject: async (id) => {
    try {
      await tauriAdapter.deleteProject(id)
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
      })
      throw error
    }
  },

  getProjectById: (id) => {
    return get().projects.find((project) => project.id === id)
  },
    }),
    {
      name: 'projects-storage',
      partialize: (state) => ({ projects: state.projects }),
    }
  )
)

