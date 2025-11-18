import { safeInvoke, isTauri } from '../utils/tauri';

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
  reminder_minutes_before?: number;
  notification_repeat?: boolean;
  tags?: Tag[];
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
  size?: number;
  created_at: number;
  version?: number;
  parent_id?: string;
  is_current?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: number;
  usage_count: number;
}

export interface TaskRelationship {
  id: string;
  task_id_1: string;
  task_id_2: string;
  relationship_type: string;
  created_at: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface CreateRelationshipInput {
  task_id_1: string;
  task_id_2: string;
  relationship_type?: string;
}

export interface TaskFilter {
  project_id?: string;
  completed?: boolean;
  due_before?: number;
  due_after?: number;
  search?: string;
  tag_id?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: number;
  priority: string;
  project_id?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  reminder_minutes_before?: number;
  notification_repeat?: boolean;
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
  reminder_minutes_before?: number;
  notification_repeat?: boolean;
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

export async function getAttachment(id: string): Promise<Attachment> {
  return safeInvoke<Attachment>('get_attachment', { id }, () => {
    throw new Error('Tauri not available');
  });
}

export async function getAttachmentPath(id: string): Promise<string> {
  return safeInvoke<string>('get_attachment_path', { id }, () => {
    throw new Error('Tauri not available');
  });
}

export async function readAttachmentFileContent(id: string): Promise<string> {
  return safeInvoke<string>('read_attachment_file_content', { id }, () => {
    throw new Error('Tauri not available');
  });
}

export async function openAttachmentFile(id: string): Promise<void> {
  return safeInvoke<void>('open_attachment_file', { id }, () => {
    throw new Error('Tauri not available');
  });
}

export async function downloadAttachment(id: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Tauri not available');
  }
  
  try {
    const { save } = await import('@tauri-apps/api/dialog');
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    const { copyFile } = await import('@tauri-apps/api/fs');
    
    // Get attachment metadata
    const attachment = await getAttachment(id);
    
    // Get source path
    const dataDir = await appDataDir();
    const sourcePath = await join(dataDir, attachment.path);
    
    // Open save dialog
    const savePath = await save({
      defaultPath: attachment.filename,
      filters: [{
        name: attachment.filename,
        extensions: [attachment.filename.split('.').pop() || ''],
      }],
    });
    
    if (savePath && typeof savePath === 'string') {
      await copyFile(sourcePath, savePath);
    }
  } catch (error) {
    console.error('Failed to download attachment:', error);
    throw error;
  }
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

// Statistics commands
export interface CompletionStats {
  date: string
  count: number
}

export interface PriorityDistribution {
  priority: string
  count: number
}

export interface ProjectStats {
  project_id: string | null
  project_name: string | null
  total_tasks: number
  completed_tasks: number
  completion_rate: number
}

export interface ProductivityTrend {
  date: string
  completion_rate: number
}

export interface MostProductiveDay {
  day_of_week: string
  count: number
}

export async function getCompletionStats(days: number): Promise<CompletionStats[]> {
  return safeInvoke<CompletionStats[]>('get_completion_stats', { days }, () => Promise.resolve([]))
}

export async function getPriorityDistribution(): Promise<PriorityDistribution[]> {
  return safeInvoke<PriorityDistribution[]>('get_priority_distribution', undefined, () =>
    Promise.resolve([])
  )
}

export async function getProjectStats(): Promise<ProjectStats[]> {
  return safeInvoke<ProjectStats[]>('get_project_stats', undefined, () => Promise.resolve([]))
}

export async function getProductivityTrend(
  startDate: number,
  endDate: number
): Promise<ProductivityTrend[]> {
  return safeInvoke<ProductivityTrend[]>('get_productivity_trend', { startDate, endDate }, () =>
    Promise.resolve([])
  )
}

export async function getMostProductiveDay(): Promise<MostProductiveDay | null> {
  return safeInvoke<MostProductiveDay | null>('get_most_productive_day', undefined, () =>
    Promise.resolve(null)
  )
}

export async function getAverageCompletionTime(): Promise<number> {
  return safeInvoke<number>('get_average_completion_time', undefined, () => Promise.resolve(0))
}

// Autostart commands
export async function isAutostartEnabled(): Promise<boolean> {
  return safeInvoke<boolean>('get_autostart_enabled', undefined, () => Promise.resolve(false))
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  return safeInvoke<void>('set_autostart_enabled', { enabled }, () => {
    console.warn('Autostart not available in browser mode')
    return Promise.resolve()
  })
}

// Template commands
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

export interface CreateTemplateInput {
  name: string
  title: string
  description?: string
  priority: string
  project_id?: string
  recurrence_type?: string
}

export interface UpdateTemplateInput {
  name?: string
  title?: string
  description?: string
  priority?: string
  project_id?: string
  recurrence_type?: string
}

export async function getTemplates(): Promise<Template[]> {
  return safeInvoke<Template[]>('get_templates', undefined, () => Promise.resolve([]))
}

export async function getTemplate(id: string): Promise<Template> {
  return safeInvoke<Template>('get_template', { id }, () => {
    throw new Error('Tauri not available - cannot get template in browser mode')
  })
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  return safeInvoke<Template>('create_template', { input }, () => {
    throw new Error('Tauri not available - cannot create template in browser mode')
  })
}

export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<Template> {
  return safeInvoke<Template>('update_template', { id, input }, () => {
    throw new Error('Tauri not available - cannot update template in browser mode')
  })
}

export async function deleteTemplate(id: string): Promise<void> {
  return safeInvoke<void>('delete_template', { id }, () => {
    throw new Error('Tauri not available - cannot delete template in browser mode')
  })
}

export async function createTaskFromTemplate(
  templateId: string,
  dueDate?: number
): Promise<Task> {
  return safeInvoke<Task>('create_task_from_template', { templateId, dueDate }, () => {
    throw new Error('Tauri not available - cannot create task from template in browser mode')
  })
}

// Gamification interfaces
export interface UserProgress {
  id: string
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_completion_date: number | null
  created_at: number
  updated_at: number
}

export interface Badge {
  id: string
  user_id: string
  badge_type: string
  earned_at: number
  metadata: string | null
}

export interface XpHistoryEntry {
  id: string
  user_id: string
  xp_amount: number
  source: string
  task_id: string | null
  created_at: number
}

export interface GrantXpResult {
  level_up: boolean
  new_level: number
  total_xp: number
  current_xp: number
  xp_to_next_level: number
}

// Gamification commands
export async function getUserProgress(): Promise<UserProgress> {
  return safeInvoke<UserProgress>('get_user_progress', undefined, () => {
    // Return default progress in browser mode
    return Promise.resolve({
      id: 'default',
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      last_completion_date: null,
      created_at: Date.now() / 1000,
      updated_at: Date.now() / 1000,
    })
  })
}

export async function grantXp(
  xp: number,
  source: string,
  taskId?: string
): Promise<GrantXpResult> {
  return safeInvoke<GrantXpResult>('grant_xp', { xp, source, taskId: taskId || null }, () => {
    throw new Error('Tauri not available - cannot grant XP in browser mode')
  })
}

export async function updateStreak(): Promise<UserProgress> {
  return safeInvoke<UserProgress>('update_streak', undefined, () => {
    throw new Error('Tauri not available - cannot update streak in browser mode')
  })
}

export async function checkStreakOnStartup(): Promise<UserProgress> {
  return safeInvoke<UserProgress>('check_streak_on_startup', undefined, () => {
    throw new Error('Tauri not available - cannot check streak in browser mode')
  })
}

export async function getBadges(): Promise<Badge[]> {
  return safeInvoke<Badge[]>('get_badges', undefined, () => Promise.resolve([]))
}

export async function checkAndAwardBadges(): Promise<Badge[]> {
  return safeInvoke<Badge[]>('check_and_award_badges', undefined, () => Promise.resolve([]))
}

// Translation types
export interface TranslatedContent {
  title: string
  description?: string
  source_lang: string
  target_lang: string
}

// Translation commands
export async function translateTaskContent(
  taskId: string,
  targetLang: 'en' | 'tr'
): Promise<TranslatedContent> {
  return safeInvoke<TranslatedContent>(
    'translate_task_content',
    { request: { task_id: taskId, target_lang: targetLang } },
    () => {
      throw new Error('Translation is only available in Tauri desktop app')
    }
  )
}

export async function saveTranslationOverride(
  taskId: string,
  field: 'title' | 'description',
  targetLang: 'en' | 'tr',
  translatedText: string
): Promise<void> {
  return safeInvoke<void>(
    'save_translation_override',
    {
      task_id: taskId,
      field,
      target_lang: targetLang,
      translated_text: translatedText,
    },
    () => {
      throw new Error('Translation is only available in Tauri desktop app')
    }
  )
}

export async function getTranslation(
  taskId: string,
  field: 'title' | 'description',
  targetLang: 'en' | 'tr'
): Promise<string | null> {
  return safeInvoke<string | null>(
    'get_translation',
    {
      task_id: taskId,
      field,
      target_lang: targetLang,
    },
    () => Promise.resolve(null)
  )
}

// Tag commands
export async function getAllTags(): Promise<Tag[]> {
  return safeInvoke<Tag[]>('get_all_tags', undefined, () => Promise.resolve([]))
}

export async function getTaskTags(taskId: string): Promise<Tag[]> {
  return safeInvoke<Tag[]>('get_task_tags', { taskId }, () => Promise.resolve([]))
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  return safeInvoke<Tag>('create_tag', { input }, () => {
    throw new Error('Tauri not available - cannot create tag in browser mode')
  })
}

export async function deleteTag(tagId: string): Promise<void> {
  return safeInvoke<void>('delete_tag', { tagId }, () => {
    throw new Error('Tauri not available - cannot delete tag in browser mode')
  })
}

export async function addTagToTask(taskId: string, tagId: string): Promise<void> {
  return safeInvoke<void>('add_tag_to_task', { taskId, tagId }, () => {
    throw new Error('Tauri not available - cannot add tag to task in browser mode')
  })
}

export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  return safeInvoke<void>('remove_tag_from_task', { taskId, tagId }, () => {
    throw new Error('Tauri not available - cannot remove tag from task in browser mode')
  })
}

export async function getSuggestedTags(search: string): Promise<Tag[]> {
  return safeInvoke<Tag[]>('get_suggested_tags', { search }, () => Promise.resolve([]))
}

export async function getTasksByTag(tagId: string): Promise<Task[]> {
  return safeInvoke<Task[]>('get_tasks_by_tag', { tagId }, () => Promise.resolve([]))
}

export async function getTasksByTags(tagIds: string[]): Promise<Task[]> {
  return safeInvoke<Task[]>('get_tasks_by_tags', { tag_ids: tagIds }, () => Promise.resolve([]))
}

// Task relationship commands
export async function createTaskRelationship(input: CreateRelationshipInput): Promise<TaskRelationship> {
  return safeInvoke<TaskRelationship>('create_task_relationship', { input }, () => {
    throw new Error('Tauri not available - cannot create task relationship in browser mode')
  })
}

export async function deleteTaskRelationship(relationshipId: string): Promise<void> {
  return safeInvoke<void>('delete_task_relationship', { relationship_id: relationshipId }, () => {
    throw new Error('Tauri not available - cannot delete task relationship in browser mode')
  })
}

export async function getRelatedTasks(taskId: string): Promise<Task[]> {
  return safeInvoke<Task[]>('get_related_tasks', { taskId }, () => Promise.resolve([]))
}

export async function checkCircularDependency(blockingTaskId: string, blockedTaskId: string): Promise<boolean> {
  return safeInvoke<boolean>('check_circular_dependency', { blockingTaskId, blockedTaskId }, () => Promise.resolve(false))
}

export async function getBlockingTasks(taskId: string): Promise<Task[]> {
  return safeInvoke<Task[]>('get_blocking_tasks', { taskId }, () => Promise.resolve([]))
}

export async function getBlockedTasks(taskId: string): Promise<Task[]> {
  return safeInvoke<Task[]>('get_blocked_tasks', { taskId }, () => Promise.resolve([]))
}

// Pomodoro session types
export interface PomodoroSession {
  id: string
  user_id: string
  task_id?: string
  started_at: number
  completed_at: number
  duration_seconds: number
  mode: string
  was_completed: boolean
  task_completed: boolean
  created_at: number
}

export interface PomodoroStats {
  total_sessions: number
  total_duration_minutes: number
  completed_sessions: number
  average_duration_minutes: number
  sessions_by_mode: ModeStats[]
}

export interface ModeStats {
  mode: string
  count: number
  total_duration_minutes: number
}

export interface DailyPomodoroStats {
  date: string
  session_count: number
  total_duration_minutes: number
  completed_count: number
}

export interface BestFocusTime {
  hour: number
  session_count: number
  average_duration_minutes: number
  completion_rate: number
}

export interface TaskCompletionRate {
  task_id: string
  task_title: string
  pomodoro_count: number
  completion_rate: number
}

export interface PomodoroStreak {
  current_streak: number
  longest_streak: number
  last_session_date?: number
}

// Pomodoro session commands
export async function createPomodoroSession(
  taskId: string | null,
  startedAt: number,
  completedAt: number,
  durationSeconds: number,
  mode: string,
  wasCompleted: boolean,
  taskCompleted: boolean
): Promise<PomodoroSession> {
  return safeInvoke<PomodoroSession>(
    'create_pomodoro_session',
    {
      input: {
        task_id: taskId,
        started_at: startedAt,
        completed_at: completedAt,
        duration_seconds: durationSeconds,
        mode,
        was_completed: wasCompleted,
        task_completed: taskCompleted,
      }
    },
    () => {
      throw new Error('Tauri not available - cannot create pomodoro session in browser mode')
    }
  )
}

export async function getPomodoroStats(
  startDate?: number,
  endDate?: number
): Promise<PomodoroStats> {
  return safeInvoke<PomodoroStats>(
    'get_pomodoro_stats',
    { start_date: startDate || null, end_date: endDate || null },
    () => ({
      total_sessions: 0,
      total_duration_minutes: 0,
      completed_sessions: 0,
      average_duration_minutes: 0,
      sessions_by_mode: [],
    })
  )
}

export async function getDailyPomodoroStats(
  startDate: number,
  endDate: number
): Promise<DailyPomodoroStats[]> {
  return safeInvoke<DailyPomodoroStats[]>(
    'get_daily_pomodoro_stats',
    { start_date: startDate, end_date: endDate },
    () => Promise.resolve([])
  )
}

export async function getBestFocusTimes(): Promise<BestFocusTime[]> {
  return safeInvoke<BestFocusTime[]>('get_best_focus_times', undefined, () =>
    Promise.resolve([])
  )
}

export async function getTaskCompletionRates(): Promise<TaskCompletionRate[]> {
  return safeInvoke<TaskCompletionRate[]>('get_task_completion_rates', undefined, () =>
    Promise.resolve([])
  )
}

export async function getPomodoroStreak(): Promise<PomodoroStreak> {
  return safeInvoke<PomodoroStreak>('get_pomodoro_streak', undefined, () => ({
    current_streak: 0,
    longest_streak: 0,
    last_session_date: undefined,
  }))
}
