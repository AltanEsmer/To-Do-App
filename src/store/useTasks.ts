import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tauriAdapter from '../api/tauriAdapter'

export type TaskPriority = 'low' | 'medium' | 'high'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: Date
  priority: TaskPriority
  createdAt: Date
  updatedAt: Date
  projectId?: string
  orderIndex?: number
  recurrenceType: RecurrenceType
  recurrenceInterval: number
  recurrenceParentId?: string
}

interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  syncTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getTaskById: (id: string) => Task | undefined
}

// Convert Rust Task to frontend Task
function convertTask(task: tauriAdapter.Task): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    dueDate: task.due_date ? new Date(task.due_date * 1000) : undefined,
    priority: task.priority as TaskPriority,
    createdAt: new Date(task.created_at * 1000),
    updatedAt: new Date(task.updated_at * 1000),
    projectId: task.project_id,
    orderIndex: task.order_index,
    recurrenceType: (task.recurrence_type as RecurrenceType) || 'none',
    recurrenceInterval: task.recurrence_interval || 1,
    recurrenceParentId: task.recurrence_parent_id,
  }
}

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      loading: false,
      error: null,

      syncTasks: async () => {
    set({ loading: true, error: null })
    try {
      const rustTasks = await tauriAdapter.getTasks()
      const tasks = rustTasks.map(convertTask)
      set({ tasks, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sync tasks',
        loading: false,
      })
    }
  },

  addTask: async (taskData) => {
    try {
      const rustTask = await tauriAdapter.createTask({
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate ? Math.floor(taskData.dueDate.getTime() / 1000) : undefined,
        priority: taskData.priority,
        project_id: taskData.projectId,
        recurrence_type: taskData.recurrenceType || 'none',
        recurrence_interval: taskData.recurrenceInterval || 1,
      })
      const newTask = convertTask(rustTask)
      set((state) => ({
        tasks: [...state.tasks, newTask],
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
      })
      throw error
    }
  },

  updateTask: async (id, updates) => {
    try {
      const rustTask = await tauriAdapter.updateTask(id, {
        title: updates.title,
        description: updates.description,
        due_date: updates.dueDate ? Math.floor(updates.dueDate.getTime() / 1000) : undefined,
        priority: updates.priority,
        project_id: updates.projectId,
        order_index: updates.orderIndex,
        recurrence_type: updates.recurrenceType !== undefined ? updates.recurrenceType : undefined,
        recurrence_interval: updates.recurrenceInterval !== undefined ? updates.recurrenceInterval : undefined,
      })
      const updatedTask = convertTask(rustTask)
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
      })
      throw error
    }
  },

  toggleComplete: async (id) => {
    try {
      const rustTask = await tauriAdapter.toggleComplete(id)
      const updatedTask = convertTask(rustTask)
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle task',
      })
      throw error
    }
  },

  deleteTask: async (id) => {
    try {
      await tauriAdapter.deleteTask(id)
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
      })
      throw error
    }
  },

  getTaskById: (id) => {
    return get().tasks.find((task) => task.id === id)
  },
    }),
    {
      name: 'tasks-storage',
      // Only persist tasks array, not loading/error states
      partialize: (state) => ({ tasks: state.tasks }),
    }
  )
)
