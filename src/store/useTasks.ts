import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tauriAdapter from '../api/tauriAdapter'

export type TaskPriority = 'low' | 'medium' | 'high'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

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
  reminderMinutesBefore?: number
  notificationRepeat?: boolean
  tags?: tauriAdapter.Tag[]
  status?: TaskStatus
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
  addTagToTask: (taskId: string, tagId: string) => Promise<void>
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>
  getRelatedTasks: (taskId: string) => Promise<Task[]>
  getBlockingTasks: (taskId: string) => Promise<Task[]>
  getBlockedTasks: (taskId: string) => Promise<Task[]>
  checkIsBlocked: (taskId: string) => Promise<boolean>
  checkCircularDependency: (blockingTaskId: string, blockedTaskId: string) => Promise<boolean>
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
    reminderMinutesBefore: task.reminder_minutes_before,
    notificationRepeat: task.notification_repeat,
    tags: task.tags,
    status: (task as any).status as TaskStatus || (task.completed ? 'done' : 'todo'),
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
      console.error('Error syncing tasks:', error)
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
        reminder_minutes_before: taskData.reminderMinutesBefore,
        notification_repeat: taskData.notificationRepeat,
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
    // Optimistic update - update UI immediately
    const previousTasks = get().tasks
    const taskToUpdate = previousTasks.find(task => task.id === id)
    
    if (taskToUpdate) {
      set((state) => ({
        tasks: state.tasks.map((task) => 
          task.id === id 
            ? { ...task, ...updates, updatedAt: new Date() }
            : task
        ),
      }))
    }

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
        reminder_minutes_before: updates.reminderMinutesBefore,
        notification_repeat: updates.notificationRepeat,
      })
      const updatedTask = convertTask(rustTask)
      // Apply the status from optimistic update if it was provided
      if (updates.status !== undefined) {
        updatedTask.status = updates.status
      }
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }))
    } catch (error) {
      // Rollback optimistic update on error
      set({ tasks: previousTasks })
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
      })
      throw error
    }
  },

  toggleComplete: async (id) => {
    try {
      // Get task before toggle to check completion state
      const currentTask = get().tasks.find((task) => task.id === id)
      const wasCompleted = currentTask?.completed ?? false
      const taskPriority = currentTask?.priority ?? 'medium'

      const rustTask = await tauriAdapter.toggleComplete(id)
      const updatedTask = convertTask(rustTask)
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }))

      // Handle XP gamification - backend handles XP granting/revoking, just sync state
      const isNowCompleted = updatedTask.completed
      if (wasCompleted !== isNowCompleted) {
        // Sync XP from backend after task completion or uncompletion
        const { useXp } = await import('./useXp')
        const { toast } = await import('../components/ui/use-toast')
        
        // Sync XP state from backend
        await useXp.getState().syncFromBackend()
        
        // Check for badges
        await useXp.getState().checkBadges()
        
        // Show XP toast only when completing (not when uncompleting)
        if (isNowCompleted) {
          const xpValues: Record<TaskPriority, number> = {
            low: 10,
            medium: 25,
            high: 50,
          }
          const xpAmount = xpValues[taskPriority]
          const priorityLabels: Record<TaskPriority, string> = {
            low: 'Low priority task done',
            medium: 'Medium priority task done',
            high: 'High priority task done',
          }
          toast({
            title: `+${xpAmount} XP`,
            description: priorityLabels[taskPriority],
            variant: 'success',
            duration: 3000,
          })
        }
      }
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

  addTagToTask: async (taskId: string, tagId: string) => {
    try {
      await tauriAdapter.addTagToTask(taskId, tagId)
      // Refresh the task to get updated tags
      const rustTask = await tauriAdapter.getTask(taskId)
      const updatedTask = convertTask(rustTask)
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add tag to task',
      })
      throw error
    }
  },

  removeTagFromTask: async (taskId: string, tagId: string) => {
    try {
      await tauriAdapter.removeTagFromTask(taskId, tagId)
      // Refresh the task to get updated tags
      const rustTask = await tauriAdapter.getTask(taskId)
      const updatedTask = convertTask(rustTask)
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove tag from task',
      })
      throw error
    }
  },

  getRelatedTasks: async (taskId: string) => {
    try {
      const rustTasks = await tauriAdapter.getRelatedTasks(taskId)
      return rustTasks.map(convertTask)
    } catch (error) {
      console.error('Failed to get related tasks:', error)
      return []
    }
  },

  getBlockingTasks: async (taskId: string) => {
    try {
      const rustTasks = await tauriAdapter.getBlockingTasks(taskId)
      return rustTasks.map(convertTask)
    } catch (error) {
      console.error('Failed to get blocking tasks:', error)
      return []
    }
  },

  getBlockedTasks: async (taskId: string) => {
    try {
      const rustTasks = await tauriAdapter.getBlockedTasks(taskId)
      return rustTasks.map(convertTask)
    } catch (error) {
      console.error('Failed to get blocked tasks:', error)
      return []
    }
  },

  checkIsBlocked: async (taskId: string) => {
    try {
      const blockingTasks = await tauriAdapter.getBlockingTasks(taskId)
      return blockingTasks.some(task => !task.completed)
    } catch (error) {
      console.error('Failed to check if task is blocked:', error)
      return false
    }
  },

  checkCircularDependency: async (blockingTaskId: string, blockedTaskId: string) => {
    try {
      return await tauriAdapter.checkCircularDependency(blockingTaskId, blockedTaskId)
    } catch (error) {
      console.error('Failed to check circular dependency:', error)
      return false
    }
  },
    }),
    {
      name: 'tasks-storage',
      // Only persist tasks array, not loading/error states
      partialize: (state) => ({ tasks: state.tasks }),
      // Merge function to restore Date objects from strings
      merge: (persistedState, currentState) => {
        const state = persistedState as any
        if (state?.tasks && Array.isArray(state.tasks)) {
          state.tasks = state.tasks.map((task: any) => ({
            ...task,
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
            updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date(),
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          }))
        }
        return { ...currentState, ...state }
      },
    }
  )
)
