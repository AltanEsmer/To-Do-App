import { Command } from '../utils/commandPattern'
import { Task } from '../store/useTasks'

interface TaskStore {
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  getTaskById: (id: string) => Task | undefined
}

export class CreateTaskCommand implements Command {
  private taskId?: string
  private isExecuted = false
  
  constructor(
    private taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
    private store: TaskStore
  ) {}

  async execute(): Promise<void> {
    await this.store.addTask(this.taskData)
    
    // Only capture the task ID on first execution
    if (!this.isExecuted) {
      const tasks = (this.store as any).tasks as Task[]
      // Find the most recently created task with matching title
      const createdTask = tasks
        .filter(t => t.title === this.taskData.title)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      
      if (createdTask) {
        this.taskId = createdTask.id
        this.isExecuted = true
      }
    }
  }

  async undo(): Promise<void> {
    if (this.taskId) {
      await this.store.deleteTask(this.taskId)
    }
  }

  getDescription(): string {
    return `Create task: ${this.taskData.title}`
  }
}

export class UpdateTaskCommand implements Command {
  private previousData?: Task
  private isFirstExecution = true

  constructor(
    private taskId: string,
    private updates: Partial<Omit<Task, 'id' | 'createdAt'>>,
    private store: TaskStore
  ) {}

  async execute(): Promise<void> {
    // Only capture previous state on first execution
    if (this.isFirstExecution) {
      this.previousData = this.store.getTaskById(this.taskId)
      this.isFirstExecution = false
    }
    await this.store.updateTask(this.taskId, this.updates)
  }

  async undo(): Promise<void> {
    if (this.previousData) {
      const { id, createdAt, updatedAt, ...restoreData } = this.previousData
      await this.store.updateTask(this.taskId, restoreData)
    }
  }

  getDescription(): string {
    return `Update task: ${this.previousData?.title || this.taskId}`
  }
}

export class DeleteTaskCommand implements Command {
  private deletedTask?: Task
  private isFirstExecution = true

  constructor(
    private taskId: string,
    private store: TaskStore
  ) {}

  async execute(): Promise<void> {
    // Only capture task data on first execution
    if (this.isFirstExecution) {
      this.deletedTask = this.store.getTaskById(this.taskId)
      this.isFirstExecution = false
    }
    await this.store.deleteTask(this.taskId)
  }

  async undo(): Promise<void> {
    if (this.deletedTask) {
      // Restore the task - but we can't restore the exact same ID
      // The backend will create a new ID when we add it back
      await this.store.addTask({
        title: this.deletedTask.title,
        description: this.deletedTask.description,
        completed: this.deletedTask.completed,
        dueDate: this.deletedTask.dueDate,
        priority: this.deletedTask.priority,
        projectId: this.deletedTask.projectId,
        orderIndex: this.deletedTask.orderIndex,
        recurrenceType: this.deletedTask.recurrenceType,
        recurrenceInterval: this.deletedTask.recurrenceInterval,
        recurrenceParentId: this.deletedTask.recurrenceParentId,
        reminderMinutesBefore: this.deletedTask.reminderMinutesBefore,
        notificationRepeat: this.deletedTask.notificationRepeat,
        tags: this.deletedTask.tags,
        status: this.deletedTask.status,
      })
      
      // Update the taskId to the new task ID
      const tasks = (this.store as any).tasks as Task[]
      const restoredTask = tasks
        .filter(t => t.title === this.deletedTask!.title)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      
      if (restoredTask) {
        this.taskId = restoredTask.id
      }
    }
  }

  getDescription(): string {
    return `Delete task: ${this.deletedTask?.title || this.taskId}`
  }
}

export class ToggleTaskCommand implements Command {
  constructor(
    private taskId: string,
    private store: TaskStore
  ) {}

  async execute(): Promise<void> {
    await this.store.toggleComplete(this.taskId)
  }

  async undo(): Promise<void> {
    await this.store.toggleComplete(this.taskId)
  }

  getDescription(): string {
    const task = this.store.getTaskById(this.taskId)
    return `Toggle task: ${task?.title || this.taskId}`
  }
}
