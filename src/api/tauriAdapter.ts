import { safeInvoke } from '../utils/tauri';

// Types matching Rust structs
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: number; // Unix timestamp
  priority: string;
  created_at: number;
  updated_at: number;
  project_id?: string;
  order_index: number;
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_parent_id?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  created_at: number;
  updated_at: number;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  task_id: string;
  filename: string;
  path: string;
  mime?: string;
  created_at: number;
}

export interface TaskFilter {
  project_id?: string;
  completed?: boolean;
  due_before?: number;
  due_after?: number;
  search?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: number;
  priority: string;
  project_id?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: number;
  priority?: string;
  project_id?: string;
  order_index?: number;
  recurrence_type?: string;
  recurrence_interval?: number;
}

export interface CreateProjectInput {
  name: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  color?: string;
}

export interface ImportSummary {
  tasks_added: number;
  tasks_updated: number;
  projects_added: number;
  projects_updated: number;
}

// Helper to convert Task with Unix timestamp to Date
function taskFromRust(task: Task): Task & { dueDate?: Date; createdAt: Date; updatedAt: Date } {
  return {
    ...task,
    dueDate: task.due_date ? new Date(task.due_date * 1000) : undefined,
    createdAt: new Date(task.created_at * 1000),
    updatedAt: new Date(task.updated_at * 1000),
  };
}

// Task commands
export async function getTasks(filter?: TaskFilter): Promise<Task[]> {
  return safeInvoke<Task[]>('get_tasks', { filter: filter || null }, () => {
    console.warn('Running in browser mode - tasks not persisted. Use npm run tauri:dev for full functionality.');
    return Promise.resolve([]);
  });
}

export async function getTask(id: string): Promise<Task> {
  return safeInvoke<Task>('get_task', { id }, () => {
    throw new Error('Tauri not available - cannot get task in browser mode');
  });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const task = await safeInvoke<Task>('create_task', { input }, () => {
    throw new Error('Tauri not available - cannot create task in browser mode');
  });
  return taskFromRust(task) as Task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const task = await safeInvoke<Task>('update_task', { id, input }, () => {
    throw new Error('Tauri not available - cannot update task in browser mode');
  });
  return taskFromRust(task) as Task;
}

export async function deleteTask(id: string): Promise<void> {
  return safeInvoke<void>('delete_task', { id }, () => {
    throw new Error('Tauri not available - cannot delete task in browser mode');
  });
}

export async function toggleComplete(id: string): Promise<Task> {
  const task = await safeInvoke<Task>('toggle_complete', { id }, () => {
    throw new Error('Tauri not available - cannot toggle task in browser mode');
  });
  return taskFromRust(task) as Task;
}

// Project commands
export async function getProjects(): Promise<Project[]> {
  return safeInvoke<Project[]>('get_projects', undefined, () => Promise.resolve([]));
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return safeInvoke<Project>('create_project', { input }, () => {
    throw new Error('Tauri not available - cannot create project in browser mode');
  });
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  return safeInvoke<Project>('update_project', { id, input }, () => {
    throw new Error('Tauri not available - cannot update project in browser mode');
  });
}

export async function deleteProject(id: string): Promise<void> {
  return safeInvoke<void>('delete_project', { id }, () => {
    throw new Error('Tauri not available - cannot delete project in browser mode');
  });
}

// Subtask commands
export async function addSubtask(taskId: string, title: string): Promise<Subtask> {
  return safeInvoke<Subtask>('add_subtask', { taskId, title }, () => {
    throw new Error('Tauri not available');
  });
}

export async function updateSubtask(
  id: string,
  title?: string,
  completed?: boolean
): Promise<Subtask> {
  return safeInvoke<Subtask>('update_subtask', { id, title, completed }, () => {
    throw new Error('Tauri not available');
  });
}

export async function deleteSubtask(id: string): Promise<void> {
  return safeInvoke<void>('delete_subtask', { id }, () => {
    throw new Error('Tauri not available');
  });
}

export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  return safeInvoke<Subtask[]>('get_subtasks', { taskId }, () => Promise.resolve([]));
}

// Attachment commands
export async function getAttachments(taskId: string): Promise<Attachment[]> {
  return safeInvoke<Attachment[]>('get_attachments', { taskId }, () => Promise.resolve([]));
}

export async function addAttachment(taskId: string, filePath: string): Promise<Attachment> {
  return safeInvoke<Attachment>('add_attachment', { taskId, filePath }, () => {
    throw new Error('Tauri not available');
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  return safeInvoke<void>('delete_attachment', { id }, () => {
    throw new Error('Tauri not available');
  });
}

// Settings commands
export async function getSettings(): Promise<Record<string, string>> {
  return safeInvoke<Record<string, string>>('get_settings', undefined, () => Promise.resolve({}));
}

export async function updateSettings(key: string, value: string): Promise<void> {
  return safeInvoke<void>('update_settings', { key, value }, () => {
    console.warn('Settings not persisted in browser mode');
    return Promise.resolve();
  });
}

// Backup commands
export async function createBackup(): Promise<string> {
  return safeInvoke<string>('create_backup', undefined, () => {
    throw new Error('Tauri not available - backups not supported in browser mode');
  });
}

export async function restoreBackup(backupPath: string): Promise<void> {
  return safeInvoke<void>('restore_backup', { backupPath }, () => {
    throw new Error('Tauri not available - restore not supported in browser mode');
  });
}

// Export/Import commands
export async function exportData(): Promise<string> {
  return safeInvoke<string>('export_data', undefined, () => {
    throw new Error('Tauri not available - export not supported in browser mode');
  });
}

export async function importData(filePath: string): Promise<ImportSummary> {
  return safeInvoke<ImportSummary>('import_data', { filePath }, () => {
    throw new Error('Tauri not available - import not supported in browser mode');
  });
}

// Notification command
export async function showNotification(title: string, body: string): Promise<void> {
  return safeInvoke<void>('show_notification', { title, body }, () => {
    // Fallback to browser notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
    return Promise.resolve();
  });
}

