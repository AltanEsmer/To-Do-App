import { create } from 'zustand'
import { addDays, startOfDay } from 'date-fns'

export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: Date
  priority: TaskPriority
  createdAt: Date
  updatedAt: Date
}

interface TasksState {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  toggleComplete: (id: string) => void
  deleteTask: (id: string) => void
  getTaskById: (id: string) => Task | undefined
}

// Mock seed data
const createMockTask = (
  title: string,
  completed: boolean,
  dueDate?: Date,
  priority: TaskPriority = 'medium'
): Task => {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    title,
    completed,
    dueDate,
    priority,
    createdAt: now,
    updatedAt: now,
  }
}

const initialTasks: Task[] = [
  createMockTask('Complete project setup', false, startOfDay(new Date()), 'high'),
  createMockTask('Review design mockups', false, addDays(startOfDay(new Date()), 2), 'medium'),
  createMockTask('Write documentation', true, addDays(startOfDay(new Date()), -1), 'low'),
  createMockTask('Schedule team meeting', false, addDays(startOfDay(new Date()), 5), 'medium'),
  createMockTask('Fix bug in authentication', true, startOfDay(new Date()), 'high'),
]

export const useTasks = create<TasksState>((set, get) => ({
  tasks: initialTasks.map((task) => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  })),

  addTask: (taskData) => {
    const now = new Date()
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
    }
    set((state) => ({
      tasks: [...state.tasks, newTask],
    }))
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...updates,
              updatedAt: new Date(),
              dueDate: updates.dueDate ? new Date(updates.dueDate) : task.dueDate,
            }
          : task
      ),
    }))
  },

  toggleComplete: (id) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed, updatedAt: new Date() }
          : task
      ),
    }))
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }))
  },

  getTaskById: (id) => {
    return get().tasks.find((task) => task.id === id)
  },
}))

