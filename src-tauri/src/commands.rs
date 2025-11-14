use crate::db::DbConnection;
use crate::services::pomodoro_service;
use crate::services::stats_service;
use crate::services::translation_service;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

// Data structures matching frontend types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub due_date: Option<i64>, // Unix timestamp
    pub priority: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub project_id: Option<String>,
    pub order_index: i32,
    pub recurrence_type: String, // none, daily, weekly, monthly, custom
    pub recurrence_interval: i32,
    pub recurrence_parent_id: Option<String>,
    pub reminder_minutes_before: Option<i32>,
    pub notification_repeat: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<Tag>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtask {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub task_id: String,
    pub filename: String,
    pub path: String,
    pub mime: Option<String>,
    pub size: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
    pub usage_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRelationship {
    pub id: String,
    pub task_id_1: String,
    pub task_id_2: String,
    pub relationship_type: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRelationshipInput {
    pub task_id_1: String,
    pub task_id_2: String,
    pub relationship_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskFilter {
    pub project_id: Option<String>,
    pub completed: Option<bool>,
    pub due_before: Option<i64>,
    pub due_after: Option<i64>,
    pub search: Option<String>,
    pub tag_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<i64>,
    pub priority: String,
    pub project_id: Option<String>,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub reminder_minutes_before: Option<i32>,
    pub notification_repeat: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<i64>,
    pub priority: Option<String>,
    pub project_id: Option<String>,
    pub order_index: Option<i32>,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub reminder_minutes_before: Option<i32>,
    pub notification_repeat: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportSummary {
    pub tasks_added: usize,
    pub tasks_updated: usize,
    pub projects_added: usize,
    pub projects_updated: usize,
}

// Helper function to get current timestamp
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

// Helper function to fetch tags for a task
// Returns empty vector if tags table doesn't exist or on any error
fn fetch_task_tags(conn: &rusqlite::Connection, task_id: &str) -> Result<Vec<Tag>, String> {
    // Check if tags table exists first
    let table_exists: bool = match conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tags'",
        [],
        |row| Ok(row.get::<_, i64>(0)? > 0),
    ) {
        Ok(exists) => exists,
        Err(_) => return Ok(Vec::new()), // If we can't check, return empty
    };
    
    if !table_exists {
        return Ok(Vec::new()); // Tags table doesn't exist, return empty
    }
    
    // Try to fetch tags, but don't fail if there's an error
    match conn.prepare(
        "SELECT t.id, t.name, t.color, t.created_at, t.usage_count 
         FROM tags t 
         INNER JOIN task_tags tt ON t.id = tt.tag_id 
         WHERE tt.task_id = ?1 
         ORDER BY t.name"
    ) {
        Ok(mut stmt) => {
            match stmt.query_map(params![task_id], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: row.get(3)?,
                    usage_count: row.get(4)?,
                })
            }) {
                Ok(rows) => {
                    let mut tags = Vec::new();
                    for row in rows {
                        match row {
                            Ok(tag) => tags.push(tag),
                            Err(_) => continue, // Skip invalid rows
                        }
                    }
                    Ok(tags)
                }
                Err(_) => Ok(Vec::new()), // Query failed, return empty
            }
        }
        Err(_) => Ok(Vec::new()), // Prepare failed, return empty
    }
}

// Helper function to fetch a task by ID (assumes lock is already held)
fn fetch_task(conn: &rusqlite::Connection, id: &str) -> Result<Task, String> {
    let mut task = conn.query_row(
        "SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id, reminder_minutes_before, notification_repeat FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                due_date: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                priority: row.get(6)?,
                completed: row.get::<_, Option<i64>>(7)?.is_some(),
                project_id: row.get(8)?,
                order_index: row.get(9).unwrap_or(0),
                recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
                recurrence_interval: row.get(12).unwrap_or(1),
                recurrence_parent_id: row.get(13).ok(),
                reminder_minutes_before: row.get(14).ok().flatten(),
                notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
                tags: None,
            })
        },
    ).map_err(|e| format!("Task not found: {}", e))?;
    
    // Fetch tags for the task
    task.tags = Some(fetch_task_tags(conn, id)?);
    
    Ok(task)
}

// Task commands
#[tauri::command]
pub fn get_tasks(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    filter: Option<TaskFilter>,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut query = "SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id, reminder_minutes_before, notification_repeat FROM tasks WHERE 1=1".to_string();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(f) = &filter {
        if let Some(project_id) = &f.project_id {
            query.push_str(" AND project_id = ?");
            query_params.push(Box::new(project_id.clone()));
        }
        if let Some(completed) = f.completed {
            if completed {
                query.push_str(" AND completed_at IS NOT NULL");
            } else {
                query.push_str(" AND completed_at IS NULL");
            }
        }
        if let Some(due_before) = f.due_before {
            query.push_str(" AND due_at <= ?");
            query_params.push(Box::new(due_before));
        }
        if let Some(due_after) = f.due_after {
            query.push_str(" AND due_at >= ?");
            query_params.push(Box::new(due_after));
        }
        if let Some(search) = &f.search {
            query.push_str(" AND (title LIKE ? OR description LIKE ?)");
            let search_pattern = format!("%{}%", search);
            query_params.push(Box::new(search_pattern.clone()));
            query_params.push(Box::new(search_pattern));
        }
        if let Some(tag_id) = &f.tag_id {
            // Only apply tag filter if task_tags table exists
            let task_tags_exists: bool = db.conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='task_tags'",
                [],
                |row| Ok(row.get::<_, i64>(0)? > 0),
            ).unwrap_or(false);
            
            if task_tags_exists {
                query.push_str(" AND id IN (SELECT task_id FROM task_tags WHERE tag_id = ?)");
                query_params.push(Box::new(tag_id.clone()));
            } else {
                // If table doesn't exist, no tasks will match tag filter, so return empty
                return Ok(Vec::new());
            }
        }
    }
    
    query.push_str(" ORDER BY order_index, created_at");
    
    let mut stmt = db.conn.prepare(&query).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params_from_iter(query_params.iter()), |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: row.get(14).ok().flatten(),
            notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        match row {
            Ok(mut task) => {
                // Fetch tags for each task - this will return empty vec if tags table doesn't exist
                match fetch_task_tags(&db.conn, &task.id) {
                    Ok(tags) => task.tags = Some(tags),
                    Err(_) => task.tags = Some(Vec::new()), // Fallback to empty if fetch fails
                }
                tasks.push(task);
            }
            Err(e) => {
                // Log error but continue processing other tasks
                eprintln!("Error parsing task row: {}", e);
                continue;
            }
        }
    }
    
    Ok(tasks)
}

#[tauri::command]
pub fn get_task(db: State<'_, Arc<Mutex<DbConnection>>>, id: String) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    fetch_task(&db.conn, &id)
}

#[tauri::command]
pub fn create_task(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    input: CreateTaskInput,
) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    db.conn.execute(
        "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id, reminder_minutes_before, notification_repeat)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id.clone(),
            input.title,
            input.description,
            input.due_date,
            now,
            now,
            input.priority,
            None::<i64>,
            input.project_id,
            0,
            None::<String>,
            input.recurrence_type.unwrap_or_else(|| "none".to_string()),
            input.recurrence_interval.unwrap_or(1),
            None::<String>,
            input.reminder_minutes_before,
            if input.notification_repeat.unwrap_or(false) { 1 } else { 0 }
        ],
    ).map_err(|e| format!("Failed to create task: {}", e))?;
    
    // Schedule notification if reminder is set
    if let Some(reminder_minutes) = input.reminder_minutes_before {
        let _ = crate::notifications::schedule_notification(&db, &id, Some(reminder_minutes));
    }
    
    fetch_task(&db.conn, &id)
}

#[tauri::command]
pub fn update_task(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    id: String,
    input: UpdateTaskInput,
) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let now = now();
    let mut updates = Vec::new();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(title) = input.title {
        updates.push("title = ?");
        query_params.push(Box::new(title));
    }
    if let Some(description) = input.description {
        updates.push("description = ?");
        query_params.push(Box::new(description));
    }
    if let Some(due_date) = input.due_date {
        updates.push("due_at = ?");
        query_params.push(Box::new(due_date));
    }
    if let Some(priority) = input.priority {
        updates.push("priority = ?");
        query_params.push(Box::new(priority));
    }
    if let Some(project_id) = input.project_id {
        updates.push("project_id = ?");
        query_params.push(Box::new(project_id));
    }
    if let Some(order_index) = input.order_index {
        updates.push("order_index = ?");
        query_params.push(Box::new(order_index));
    }
    if let Some(recurrence_type) = input.recurrence_type {
        updates.push("recurrence_type = ?");
        query_params.push(Box::new(recurrence_type));
    }
    if let Some(recurrence_interval) = input.recurrence_interval {
        updates.push("recurrence_interval = ?");
        query_params.push(Box::new(recurrence_interval));
    }
    if let Some(reminder_minutes_before) = input.reminder_minutes_before {
        updates.push("reminder_minutes_before = ?");
        query_params.push(Box::new(reminder_minutes_before));
    }
    if let Some(notification_repeat) = input.notification_repeat {
        updates.push("notification_repeat = ?");
        query_params.push(Box::new(if notification_repeat { 1 } else { 0 }));
    }
    
    if updates.is_empty() {
        return fetch_task(&db.conn, &id);
    }
    
    updates.push("updated_at = ?");
    query_params.push(Box::new(now));
    query_params.push(Box::new(id.clone()));
    
    let query = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));
    db.conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
        .map_err(|e| format!("Failed to update task: {}", e))?;
    
    // Reschedule notifications if reminder settings changed
    if input.reminder_minutes_before.is_some() || input.notification_repeat.is_some() || input.due_date.is_some() {
        // Delete existing notifications for this task
        let _ = db.conn.execute(
            "DELETE FROM notification_schedule WHERE task_id = ?1",
            params![id.clone()],
        );
        
        // Schedule new notifications
        let reminder_minutes: Option<i32> = db.conn.query_row(
            "SELECT reminder_minutes_before FROM tasks WHERE id = ?1",
            params![id.clone()],
            |row| row.get(0),
        ).ok().flatten();
        
        if reminder_minutes.is_some() {
            let _ = crate::notifications::schedule_notification(&db, &id, reminder_minutes);
        }
    }
    
    fetch_task(&db.conn, &id)
}

#[tauri::command]
pub fn delete_task(db: State<'_, Arc<Mutex<DbConnection>>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete task: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn toggle_complete(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    id: String,
) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get current task state
    let task_info: (Option<i64>, String, i32, String) = db.conn.query_row(
        "SELECT completed_at, recurrence_type, recurrence_interval, priority FROM tasks WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| format!("Task not found: {}", e))?;
    
    let (completed, recurrence_type, recurrence_interval, priority) = task_info;
    let was_completed = completed.is_some();
    let now = now();
    let new_completed = if completed.is_some() { None } else { Some(now) };
    
    db.conn.execute(
        "UPDATE tasks SET completed_at = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_completed, now, id.clone()],
    ).map_err(|e| format!("Failed to toggle complete: {}", e))?;
    
    // If task is being marked complete and has recurrence, create new instance
    if new_completed.is_some() && recurrence_type != "none" {
        create_recurring_instance(&db.conn, &id, &recurrence_type, recurrence_interval)?;
    }
    
    // Handle gamification: grant XP when completing, revoke XP when undoing
    if new_completed.is_some() && !was_completed {
        // Task is being completed - grant XP
        // Determine XP amount based on priority
        let xp_amount = match priority.as_str() {
            "low" => 10,
            "medium" => 25,
            "high" => 50,
            _ => 25,
        };
        
        // Grant XP
        let _ = grant_xp_internal(&db.conn, xp_amount, "task_completion".to_string(), Some(id.clone()));
        
        // Update streak
        let _ = update_streak_internal(&db.conn);
        
        // Check for badges
        let _ = check_and_award_badges_internal(&db.conn);
    } else if was_completed && new_completed.is_none() {
        // Task is being uncompleted - revoke XP
        // Find the most recent XP history entry for this task
        let xp_entry: Option<(i32, String)> = db.conn.query_row(
            "SELECT xp_amount, id FROM xp_history WHERE task_id = ?1 AND source = 'task_completion' ORDER BY created_at DESC LIMIT 1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).ok();
        
        if let Some((xp_amount, history_id)) = xp_entry {
            // Revoke the XP
            let _ = revoke_xp_internal(&db.conn, xp_amount, history_id);
            
            // Update streak
            let _ = update_streak_internal(&db.conn);
        }
    }
    
    fetch_task(&db.conn, &id)
}

// Helper function to create a recurring task instance
fn create_recurring_instance(conn: &rusqlite::Connection, parent_id: &str, recurrence_type: &str, interval: i32) -> Result<(), String> {
    // Fetch original task details
    let original: (String, Option<String>, Option<i64>, String, Option<String>, i32) = conn.query_row(
        "SELECT title, description, due_at, priority, project_id, order_index FROM tasks WHERE id = ?1",
        params![parent_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
    ).map_err(|e| format!("Failed to fetch original task: {}", e))?;
    
    let (title, description, due_date, priority, project_id, order_index) = original;
    
    // Calculate new due date based on recurrence type
    let new_due_date = if let Some(due) = due_date {
        let days_to_add = match recurrence_type {
            "daily" => interval,
            "weekly" => interval * 7,
            "monthly" => interval * 30, // Approximate
            _ => 0,
        };
        Some(due + (days_to_add as i64 * 24 * 60 * 60))
    } else {
        None
    };
    
    let new_id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    conn.execute(
        "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            new_id,
            title,
            description,
            new_due_date,
            now,
            now,
            priority,
            None::<i64>,
            project_id,
            order_index,
            None::<String>,
            recurrence_type,
            interval,
            Some(parent_id)
        ],
    ).map_err(|e| format!("Failed to create recurring task instance: {}", e))?;
    
    Ok(())
}

// Project commands
#[tauri::command]
pub fn get_projects(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<Vec<Project>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT id, name, color, created_at, updated_at FROM projects ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(projects)
}

#[tauri::command]
pub fn create_project(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    db.conn.execute(
        "INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id.clone(), input.name, input.color, now, now],
    ).map_err(|e| format!("Failed to create project: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, name, color, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch created project: {}", e))
}

#[tauri::command]
pub fn update_project(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    id: String,
    input: UpdateProjectInput,
) -> Result<Project, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let now = now();
    let mut updates = Vec::new();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(name) = input.name {
        updates.push("name = ?");
        query_params.push(Box::new(name));
    }
    if let Some(color) = input.color {
        updates.push("color = ?");
        query_params.push(Box::new(color));
    }
    
    if !updates.is_empty() {
        updates.push("updated_at = ?");
        query_params.push(Box::new(now));
        query_params.push(Box::new(id.clone()));
        
        let query = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
        db.conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
            .map_err(|e| format!("Failed to update project: {}", e))?;
    }
    
    db.conn.query_row(
        "SELECT id, name, color, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    ).map_err(|e| format!("Project not found: {}", e))
}

#[tauri::command]
pub fn delete_project(db: State<'_, Arc<Mutex<DbConnection>>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    
    Ok(())
}

// Subtask commands
#[tauri::command]
pub fn add_subtask(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
    title: String,
) -> Result<Subtask, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    
    db.conn.execute(
        "INSERT INTO subtasks (id, task_id, title, completed) VALUES (?1, ?2, ?3, ?4)",
        params![id.clone(), task_id.clone(), title, 0],
    ).map_err(|e| format!("Failed to create subtask: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, task_id, title, completed FROM subtasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Subtask {
                id: row.get(0)?,
                task_id: row.get(1)?,
                title: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
            })
        },
    ).map_err(|e| format!("Failed to fetch created subtask: {}", e))
}

#[tauri::command]
pub fn update_subtask(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    id: String,
    title: Option<String>,
    completed: Option<bool>,
) -> Result<Subtask, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut updates = Vec::new();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(title) = title {
        updates.push("title = ?");
        query_params.push(Box::new(title));
    }
    if let Some(completed) = completed {
        updates.push("completed = ?");
        query_params.push(Box::new(if completed { 1 } else { 0 }));
    }
    
    if !updates.is_empty() {
        query_params.push(Box::new(id.clone()));
        let query = format!("UPDATE subtasks SET {} WHERE id = ?", updates.join(", "));
        db.conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
            .map_err(|e| format!("Failed to update subtask: {}", e))?;
    }
    
    db.conn.query_row(
        "SELECT id, task_id, title, completed FROM subtasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Subtask {
                id: row.get(0)?,
                task_id: row.get(1)?,
                title: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
            })
        },
    ).map_err(|e| format!("Subtask not found: {}", e))
}

#[tauri::command]
pub fn delete_subtask(db: State<'_, Arc<Mutex<DbConnection>>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM subtasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete subtask: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_subtasks(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
) -> Result<Vec<Subtask>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT id, task_id, title, completed FROM subtasks WHERE task_id = ?1 ORDER BY id").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Subtask {
            id: row.get(0)?,
            task_id: row.get(1)?,
            title: row.get(2)?,
            completed: row.get::<_, i32>(3)? != 0,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut subtasks = Vec::new();
    for row in rows {
        subtasks.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(subtasks)
}

// Attachment commands
#[tauri::command]
pub fn get_attachments(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
) -> Result<Vec<Attachment>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT id, task_id, filename, path, mime, size, created_at FROM attachments WHERE task_id = ?1 ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            task_id: row.get(1)?,
            filename: row.get(2)?,
            path: row.get(3)?,
            mime: row.get(4)?,
            size: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut attachments = Vec::new();
    for row in rows {
        attachments.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(attachments)
}

#[tauri::command]
pub fn add_attachment(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    app_handle: tauri::AppHandle,
    task_id: String,
    file_path: String,
) -> Result<Attachment, String> {
    use crate::attachments::{copy_attachment_to_storage, validate_file_type, get_mime_type};
    use std::fs;
    
    // Validate file type
    validate_file_type(&file_path)?;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get file size before copying
    let file_size: Option<i64> = fs::metadata(&file_path)
        .ok()
        .and_then(|m| m.len().try_into().ok());
    
    // Copy file to storage
    let stored_path = copy_attachment_to_storage(&app_handle, &file_path, &task_id)
        .map_err(|e| format!("Failed to copy attachment: {}", e))?;
    
    // Get filename from original path
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    // Get MIME type from extension
    let mime = get_mime_type(&file_path);
    
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = now();
    
    db.conn.execute(
        "INSERT INTO attachments (id, task_id, filename, path, mime, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id.clone(), task_id, filename, stored_path, mime, file_size, created_at],
    ).map_err(|e| format!("Failed to create attachment record: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, task_id, filename, path, mime, size, created_at FROM attachments WHERE id = ?1",
        params![id],
        |row| {
            Ok(Attachment {
                id: row.get(0)?,
                task_id: row.get(1)?,
                filename: row.get(2)?,
                path: row.get(3)?,
                mime: row.get(4)?,
                size: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch created attachment: {}", e))
}

#[tauri::command]
pub fn delete_attachment(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    use std::fs;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get attachment path before deleting
    let path: Option<String> = db.conn.query_row(
        "SELECT path FROM attachments WHERE id = ?1",
        params![id.clone()],
        |row| row.get(0),
    ).ok();
    
    // Delete from database
    db.conn.execute("DELETE FROM attachments WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete attachment: {}", e))?;
    
    // Try to delete file
    if let Some(path) = path {
        let app_data_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or_else(|| "Failed to get app data directory".to_string())?;
        let full_path = app_data_dir.join(&path);
        let _ = fs::remove_file(full_path); // Ignore errors if file doesn't exist
    }
    
    Ok(())
}

#[tauri::command]
pub fn get_attachment(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    id: String,
) -> Result<Attachment, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, task_id, filename, path, mime, size, created_at FROM attachments WHERE id = ?1",
        params![id],
        |row| {
            Ok(Attachment {
                id: row.get(0)?,
                task_id: row.get(1)?,
                filename: row.get(2)?,
                path: row.get(3)?,
                mime: row.get(4)?,
                size: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch attachment: {}", e))
}

#[tauri::command]
pub fn get_attachment_path(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let path: String = db.conn.query_row(
        "SELECT path FROM attachments WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to fetch attachment path: {}", e))?;
    
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let full_path = app_data_dir.join(&path);
    
    if !full_path.exists() {
        return Err("Attachment file not found".to_string());
    }
    
    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_attachment_file_content(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<String, String> {
    use std::fs;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let path: String = db.conn.query_row(
        "SELECT path FROM attachments WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to fetch attachment path: {}", e))?;
    
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let full_path = app_data_dir.join(&path);
    
    if !full_path.exists() {
        return Err("Attachment file not found".to_string());
    }
    
    // Read file as text (for text files)
    fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn open_attachment_file(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    use std::process::Command as ProcessCommand;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let path: String = db.conn.query_row(
        "SELECT path FROM attachments WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to fetch attachment path: {}", e))?;
    
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let full_path = app_data_dir.join(&path);
    
    if !full_path.exists() {
        return Err("Attachment file not found".to_string());
    }
    
    // Open file with system default application
    #[cfg(target_os = "windows")]
    {
        ProcessCommand::new("cmd")
            .args(["/C", "start", "", &full_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        ProcessCommand::new("open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        ProcessCommand::new("xdg-open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    Ok(())
}

// Settings commands
#[tauri::command]
pub fn get_settings(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<HashMap<String, String>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT key, value FROM settings").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut settings = HashMap::new();
    for row in rows {
        let (key, value) = row.map_err(|e| format!("Row parsing error: {}", e))?;
        settings.insert(key, value);
    }
    
    Ok(settings)
}

#[tauri::command]
pub fn update_settings(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| format!("Failed to update setting: {}", e))?;
    
    Ok(())
}

// Backup and restore commands
#[tauri::command]
pub fn create_backup(app_handle: tauri::AppHandle) -> Result<String, String> {
    use std::fs;
    
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let db_path = app_data_dir.join("todo.db");
    let backups_dir = app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| format!("Failed to create backups directory: {}", e))?;
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("todo_backup_{}.db", timestamp);
    let backup_path = backups_dir.join(&backup_filename);
    
    fs::copy(&db_path, &backup_path).map_err(|e| format!("Failed to create backup: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn restore_backup(
    app_handle: tauri::AppHandle,
    backup_path: String,
) -> Result<(), String> {
    use std::fs;
    
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let db_path = app_data_dir.join("todo.db");
    let backup_file = std::path::Path::new(&backup_path);
    
    if !backup_file.exists() {
        return Err("Backup file does not exist".to_string());
    }
    
    // Create a backup of current DB before restoring
    let current_backup = db_path.with_extension("db.bak");
    let _ = fs::copy(&db_path, &current_backup);
    
    // Copy backup file to DB location
    fs::copy(backup_file, &db_path).map_err(|e| format!("Failed to restore backup: {}", e))?;
    
    Ok(())
}

// Export and import commands
#[tauri::command]
pub fn export_data(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use std::fs;
    use std::io::Write;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get all tasks
    let mut tasks = Vec::new();
    let mut stmt = db.conn.prepare("SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id FROM tasks ORDER BY order_index, created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: None, // This query doesn't select these fields
            notification_repeat: false,
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    for row in rows {
        tasks.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    // Get all projects
    let mut projects = Vec::new();
    let mut stmt = db.conn.prepare("SELECT id, name, color, created_at, updated_at FROM projects ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    for row in rows {
        projects.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    // Get all settings
    let mut settings = HashMap::new();
    let mut stmt = db.conn.prepare("SELECT key, value FROM settings").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| format!("Query execution error: {}", e))?;
    for row in rows {
        let (key, value) = row.map_err(|e| format!("Row parsing error: {}", e))?;
        settings.insert(key, value);
    }
    
    // Get all subtasks
    let mut all_subtasks = Vec::new();
    let mut stmt = db.conn.prepare("SELECT id, task_id, title, completed FROM subtasks ORDER BY id").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Subtask {
            id: row.get(0)?,
            task_id: row.get(1)?,
            title: row.get(2)?,
            completed: row.get::<_, i32>(3)? != 0,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    for row in rows {
        all_subtasks.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    // Get all attachments
    let mut all_attachments = Vec::new();
    let mut stmt = db.conn.prepare("SELECT id, task_id, filename, path, mime, size, created_at FROM attachments ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            task_id: row.get(1)?,
            filename: row.get(2)?,
            path: row.get(3)?,
            mime: row.get(4)?,
            size: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    for row in rows {
        all_attachments.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    let export_data = serde_json::json!({
        "tasks": tasks,
        "projects": projects,
        "subtasks": all_subtasks,
        "attachments": all_attachments,
        "settings": settings,
        "exported_at": now(),
    });
    
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let export_filename = format!("todo_export_{}.json", timestamp);
    let export_path = app_data_dir.join(&export_filename);
    
    let json_str = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    
    let mut file = fs::File::create(&export_path)
        .map_err(|e| format!("Failed to create export file: {}", e))?;
    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write export file: {}", e))?;
    
    Ok(export_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_data(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    file_path: String,
) -> Result<ImportSummary, String> {
    use std::fs;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let file_contents = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read import file: {}", e))?;
    
    let data: serde_json::Value = serde_json::from_str(&file_contents)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let mut summary = ImportSummary {
        tasks_added: 0,
        tasks_updated: 0,
        projects_added: 0,
        projects_updated: 0,
    };
    
    let tx = db.conn.unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    // Import projects
    if let Some(projects) = data.get("projects").and_then(|p| p.as_array()) {
        for project_json in projects {
            if let Ok(project) = serde_json::from_value::<Project>(project_json.clone()) {
                let exists: bool = tx.query_row(
                    "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)",
                    params![project.id],
                    |row| row.get(0),
                ).unwrap_or(false);
                
                if exists {
                    tx.execute(
                        "UPDATE projects SET name = ?1, color = ?2, updated_at = ?3 WHERE id = ?4",
                        params![project.name, project.color, now(), project.id],
                    ).ok();
                    summary.projects_updated += 1;
                } else {
                    tx.execute(
                        "INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                        params![project.id, project.name, project.color, project.created_at, project.updated_at],
                    ).ok();
                    summary.projects_added += 1;
                }
            }
        }
    }
    
    // Import tasks
    if let Some(tasks) = data.get("tasks").and_then(|t| t.as_array()) {
        for task_json in tasks {
            if let Ok(task) = serde_json::from_value::<Task>(task_json.clone()) {
                let exists: bool = tx.query_row(
                    "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?1)",
                    params![task.id],
                    |row| row.get(0),
                ).unwrap_or(false);
                
                if exists {
                    tx.execute(
                        "UPDATE tasks SET title = ?1, description = ?2, due_at = ?3, priority = ?4, completed_at = ?5, project_id = ?6, order_index = ?7, recurrence_type = ?8, recurrence_interval = ?9, updated_at = ?10 WHERE id = ?11",
                        params![
                            task.title,
                            task.description,
                            task.due_date,
                            task.priority,
                            if task.completed { Some(now()) } else { None::<i64> },
                            task.project_id,
                            task.order_index,
                            task.recurrence_type,
                            task.recurrence_interval,
                            now(),
                            task.id
                        ],
                    ).ok();
                    summary.tasks_updated += 1;
                } else {
                    tx.execute(
                        "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                        params![
                            task.id,
                            task.title,
                            task.description,
                            task.due_date,
                            task.created_at,
                            task.updated_at,
                            task.priority,
                            if task.completed { Some(task.updated_at) } else { None::<i64> },
                            task.project_id,
                            task.order_index,
                            None::<String>,
                            task.recurrence_type,
                            task.recurrence_interval,
                            task.recurrence_parent_id
                        ],
                    ).ok();
                    summary.tasks_added += 1;
                }
            }
        }
    }
    
    // Import subtasks
    if let Some(subtasks) = data.get("subtasks").and_then(|s| s.as_array()) {
        for subtask_json in subtasks {
            if let Ok(subtask) = serde_json::from_value::<Subtask>(subtask_json.clone()) {
                let _ = tx.execute(
                    "INSERT OR REPLACE INTO subtasks (id, task_id, title, completed) VALUES (?1, ?2, ?3, ?4)",
                    params![subtask.id, subtask.task_id, subtask.title, if subtask.completed { 1 } else { 0 }],
                );
            }
        }
    }
    
    // Import settings
    if let Some(settings) = data.get("settings").and_then(|s| s.as_object()) {
        for (key, value) in settings {
            if let Some(value_str) = value.as_str() {
                let _ = tx.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                    params![key, value_str],
                );
            }
        }
    }
    
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(summary)
}

// Notification command
#[tauri::command]
pub fn show_notification(title: String, body: String) -> Result<(), String> {
    crate::notifications::show_notification(&title, &body)
        .map_err(|e| format!("Failed to show notification: {}", e))
}

// Auto-start commands using Windows Registry (manual implementation for Tauri 1.8)
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn get_autostart_enabled(app_handle: tauri::AppHandle) -> Result<bool, String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    
    let app_name = app_handle.package_info().name.clone();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| format!("Failed to open registry key: {}", e))?;
    
    match run_key.get_value::<String, _>(&app_name) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn set_autostart_enabled(
    app_handle: tauri::AppHandle,
    enabled: bool,
) -> Result<(), String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    use std::env;
    
    let app_name = app_handle.package_info().name.clone();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| format!("Failed to create/open registry key: {}", e))?;
    
    if enabled {
        // Get the current executable path
        let exe_path = env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;
        let exe_path_str = exe_path.to_string_lossy().to_string();
        
        run_key.set_value(&app_name, &exe_path_str)
            .map_err(|e| format!("Failed to set registry value: {}", e))?;
    } else {
        run_key.delete_value(&app_name)
            .map_err(|e| format!("Failed to delete registry value: {}", e))?;
    }
    
    Ok(())
}

// Fallback for non-Windows platforms
#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn get_autostart_enabled(_app_handle: tauri::AppHandle) -> Result<bool, String> {
    Ok(false)
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn set_autostart_enabled(
    _app_handle: tauri::AppHandle,
    _enabled: bool,
) -> Result<(), String> {
    Err("Autostart is only supported on Windows in this version".to_string())
}

// Notification commands
#[tauri::command]
pub fn snooze_notification(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    notification_id: String,
    minutes: i32,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    crate::notifications::snooze_notification(&db, &notification_id, minutes)
        .map_err(|e| format!("Failed to snooze notification: {}", e))
}

// Statistics commands
#[tauri::command]
pub fn get_completion_stats(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    days: i32,
) -> Result<Vec<stats_service::CompletionStats>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    stats_service::get_completion_stats(&db.conn, days)
}

#[tauri::command]
pub fn get_priority_distribution(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<Vec<stats_service::PriorityDistribution>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    stats_service::get_priority_distribution(&db.conn)
}

#[tauri::command]
pub fn get_project_stats(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<Vec<stats_service::ProjectStats>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    stats_service::get_project_stats(&db.conn)
}

#[tauri::command]
pub fn get_productivity_trend(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    start_date: i64,
    end_date: i64,
) -> Result<Vec<stats_service::ProductivityTrend>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    stats_service::get_productivity_trend(&db.conn, start_date, end_date)
}

#[tauri::command]
pub fn get_most_productive_day(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<Option<stats_service::MostProductiveDay>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    stats_service::get_most_productive_day(&db.conn)
}

#[tauri::command]
pub fn get_average_completion_time(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<f64, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    stats_service::get_average_completion_time(&db.conn)
}

// Template data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub project_id: Option<String>,
    pub recurrence_type: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateInput {
    pub name: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub project_id: Option<String>,
    pub recurrence_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTemplateInput {
    pub name: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub project_id: Option<String>,
    pub recurrence_type: Option<String>,
}

// Template commands
#[tauri::command]
pub fn create_template(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    input: CreateTemplateInput,
) -> Result<Template, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    db.conn.execute(
        "INSERT INTO task_templates (id, name, title, description, priority, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id.clone(),
            input.name,
            input.title,
            input.description,
            input.priority,
            input.project_id,
            now,
            now,
        ],
    ).map_err(|e| format!("Failed to create template: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, name, title, description, priority, project_id, created_at, updated_at FROM task_templates WHERE id = ?1",
        params![id],
        |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                priority: row.get(4)?,
                project_id: row.get(5)?,
                recurrence_type: None,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch created template: {}", e))
}

#[tauri::command]
pub fn get_templates(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<Vec<Template>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT id, name, title, description, priority, project_id, created_at, updated_at FROM task_templates ORDER BY created_at DESC").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Template {
            id: row.get(0)?,
            name: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            priority: row.get(4)?,
            project_id: row.get(5)?,
            recurrence_type: None,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut templates = Vec::new();
    for row in rows {
        templates.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(templates)
}

#[tauri::command]
pub fn get_template(db: State<'_, Arc<Mutex<DbConnection>>>, id: String) -> Result<Template, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, name, title, description, priority, project_id, created_at, updated_at FROM task_templates WHERE id = ?1",
        params![id],
        |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                priority: row.get(4)?,
                project_id: row.get(5)?,
                recurrence_type: None,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    ).map_err(|e| format!("Template not found: {}", e))
}

#[tauri::command]
pub fn update_template(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    id: String,
    input: UpdateTemplateInput,
) -> Result<Template, String> {
    let now = now();
    let mut updates = Vec::new();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(name) = input.name {
        updates.push("name = ?");
        query_params.push(Box::new(name));
    }
    if let Some(title) = input.title {
        updates.push("title = ?");
        query_params.push(Box::new(title));
    }
    if let Some(description) = input.description {
        updates.push("description = ?");
        query_params.push(Box::new(description));
    }
    if let Some(priority) = input.priority {
        updates.push("priority = ?");
        query_params.push(Box::new(priority));
    }
    if let Some(project_id) = input.project_id {
        updates.push("project_id = ?");
        query_params.push(Box::new(project_id));
    }
    
    if updates.is_empty() {
        return get_template(db, id);
    }
    
    {
        let db_lock = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        updates.push("updated_at = ?");
        query_params.push(Box::new(now));
        query_params.push(Box::new(id.clone()));
        
        let query = format!("UPDATE task_templates SET {} WHERE id = ?", updates.join(", "));
        db_lock.conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
            .map_err(|e| format!("Failed to update template: {}", e))?;
    }
    
    get_template(db, id)
}

#[tauri::command]
pub fn delete_template(db: State<'_, Arc<Mutex<DbConnection>>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM task_templates WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete template: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn create_task_from_template(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    template_id: String,
    due_date: Option<i64>,
) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get template
    let template: (String, Option<String>, String, Option<String>) = db.conn.query_row(
        "SELECT title, description, priority, project_id FROM task_templates WHERE id = ?1",
        params![template_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| format!("Template not found: {}", e))?;
    
    let (title, description, priority, project_id) = template;
    
    // Create task from template
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    db.conn.execute(
        "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id.clone(),
            title,
            description,
            due_date,
            now,
            now,
            priority,
            None::<i64>,
            project_id,
            0,
            None::<String>,
            "none",
            1,
            None::<String>
        ],
    ).map_err(|e| format!("Failed to create task from template: {}", e))?;
    
    fetch_task(&db.conn, &id)
}

// Gamification data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProgress {
    pub id: String,
    pub total_xp: i64,
    pub current_level: i32,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_completion_date: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Badge {
    pub id: String,
    pub user_id: String,
    pub badge_type: String,
    pub earned_at: i64,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XpHistoryEntry {
    pub id: String,
    pub user_id: String,
    pub xp_amount: i32,
    pub source: String,
    pub task_id: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrantXpResult {
    pub level_up: bool,
    pub new_level: i32,
    pub total_xp: i64,
    pub current_xp: i64,
    pub xp_to_next_level: i64,
}

// Helper function to calculate level from total XP
// Formula: level = floor(sqrt(totalXp / 100)) + 1
fn calculate_level(total_xp: i64) -> i32 {
    if total_xp <= 0 {
        return 1;
    }
    ((total_xp as f64 / 100.0).sqrt().floor() as i32) + 1
}

// Helper function to calculate XP needed for next level
// Formula: xpToNextLevel = (level * 100) * level
fn calculate_xp_to_next_level(level: i32) -> i64 {
    (level as i64 * 100) * level as i64
}

// Helper function to calculate current XP within current level
fn calculate_current_xp(total_xp: i64, level: i32) -> i64 {
    if level == 1 {
        return total_xp;
    }
    // Calculate total XP needed to reach current level
    let mut xp_for_current_level = 0i64;
    for i in 1..level {
        xp_for_current_level += calculate_xp_to_next_level(i);
    }
    total_xp - xp_for_current_level
}

// Internal helper functions for gamification (work directly with connection)
fn grant_xp_internal(conn: &rusqlite::Connection, xp: i32, source: String, task_id: Option<String>) -> Result<GrantXpResult, String> {
    let progress = get_user_progress_internal(conn)?;
    
    let previous_level = progress.current_level;
    let new_total_xp = (progress.total_xp + xp as i64).max(0);
    let new_level = calculate_level(new_total_xp);
    let new_xp_to_next_level = calculate_xp_to_next_level(new_level);
    let new_current_xp = calculate_current_xp(new_total_xp, new_level);
    let leveled_up = new_level > previous_level;
    
    // Update user progress
    let now = now();
    conn.execute(
        "UPDATE user_progress SET total_xp = ?1, current_level = ?2, updated_at = ?3 WHERE id = 'default'",
        params![new_total_xp, new_level, now],
    ).map_err(|e| format!("Failed to update user progress: {}", e))?;
    
    // Record in XP history
    let history_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO xp_history (id, user_id, xp_amount, source, task_id, created_at) VALUES (?1, 'default', ?2, ?3, ?4, ?5)",
        params![history_id, xp, source, task_id, now],
    ).map_err(|e| format!("Failed to record XP history: {}", e))?;
    
    Ok(GrantXpResult {
        level_up: leveled_up,
        new_level,
        total_xp: new_total_xp,
        current_xp: new_current_xp,
        xp_to_next_level: new_xp_to_next_level,
    })
}

// Revoke XP (subtract XP and remove history entry)
fn revoke_xp_internal(conn: &rusqlite::Connection, xp: i32, history_id: String) -> Result<GrantXpResult, String> {
    let progress = get_user_progress_internal(conn)?;
    
    let _previous_level = progress.current_level;
    let new_total_xp = (progress.total_xp - xp as i64).max(0);
    let new_level = calculate_level(new_total_xp);
    let new_xp_to_next_level = calculate_xp_to_next_level(new_level);
    let new_current_xp = calculate_current_xp(new_total_xp, new_level);
    let leveled_up = false; // Can't level up when revoking XP
    
    // Update user progress
    let now = now();
    conn.execute(
        "UPDATE user_progress SET total_xp = ?1, current_level = ?2, updated_at = ?3 WHERE id = 'default'",
        params![new_total_xp, new_level, now],
    ).map_err(|e| format!("Failed to update user progress: {}", e))?;
    
    // Remove the XP history entry
    conn.execute(
        "DELETE FROM xp_history WHERE id = ?1",
        params![history_id],
    ).map_err(|e| format!("Failed to remove XP history: {}", e))?;
    
    Ok(GrantXpResult {
        level_up: leveled_up,
        new_level,
        total_xp: new_total_xp,
        current_xp: new_current_xp,
        xp_to_next_level: new_xp_to_next_level,
    })
}

pub(crate) fn update_streak_internal(conn: &rusqlite::Connection) -> Result<UserProgress, String> {
    let mut progress = get_user_progress_internal(conn)?;
    
    // Get today's date at midnight (Unix timestamp)
    let current_time = now();
    let today_start = (current_time / 86400) * 86400; // Round down to start of day
    let today_end = today_start + 86400 - 1; // End of day
    
    // Check if user completed at least one task today
    let tasks_completed_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE completed_at IS NOT NULL AND completed_at >= ?1 AND completed_at < ?2",
        params![today_start, today_end],
        |row| row.get(0),
    ).unwrap_or(0);
    
    let has_completed_today = tasks_completed_today > 0;
    
    if has_completed_today {
        if let Some(last_completion) = progress.last_completion_date {
            let last_completion_day = (last_completion / 86400) * 86400;
            let yesterday_start = today_start - 86400;
            
            if last_completion_day == yesterday_start {
                // Last completion was yesterday - increment streak
                progress.current_streak += 1;
            } else if last_completion_day < yesterday_start {
                // Last completion was more than 1 day ago - reset streak to 1
                progress.current_streak = 1;
            }
            // If last_completion_day == today_start, no change (already counted today)
        } else {
            // No previous completion date - start streak at 1
            progress.current_streak = 1;
        }
        
        // Update longest streak if current exceeds it
        if progress.current_streak > progress.longest_streak {
            progress.longest_streak = progress.current_streak;
        }
        
        // Update last completion date to today
        progress.last_completion_date = Some(today_start);
    }
    
    // Update database
    let update_time = now();
    conn.execute(
        "UPDATE user_progress SET current_streak = ?1, longest_streak = ?2, last_completion_date = ?3, updated_at = ?4 WHERE id = 'default'",
        params![progress.current_streak, progress.longest_streak, progress.last_completion_date, update_time],
    ).map_err(|e| format!("Failed to update streak: {}", e))?;
    
    progress.updated_at = update_time;
    Ok(progress)
}

fn check_and_award_badges_internal(conn: &rusqlite::Connection) -> Result<Vec<Badge>, String> {
    let progress = get_user_progress_internal(conn)?;
    
    // Get total tasks completed
    let total_tasks_completed: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE completed_at IS NOT NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    // Get already earned badges
    let mut stmt = conn.prepare("SELECT id, user_id, badge_type, earned_at, metadata FROM badges WHERE user_id = 'default' ORDER BY earned_at DESC")
        .map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Badge {
            id: row.get(0)?,
            user_id: row.get(1)?,
            badge_type: row.get(2)?,
            earned_at: row.get(3)?,
            metadata: row.get(4)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut earned_badges = Vec::new();
    for row in rows {
        earned_badges.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    let earned_types: std::collections::HashSet<String> = earned_badges.iter()
        .map(|b| b.badge_type.clone())
        .collect();
    
    let mut newly_awarded = Vec::new();
    let now = now();
    
    // Check each badge criteria
    // first_task: total_tasks_completed >= 1
    if total_tasks_completed >= 1 && !earned_types.contains("first_task") {
        let badge_id = uuid::Uuid::new_v4().to_string();
        let metadata = serde_json::json!({"milestone": 1}).to_string();
        conn.execute(
            "INSERT INTO badges (id, user_id, badge_type, earned_at, metadata) VALUES (?1, 'default', 'first_task', ?2, ?3)",
            params![badge_id.clone(), now, metadata],
        ).map_err(|e| format!("Failed to award badge: {}", e))?;
        
        newly_awarded.push(Badge {
            id: badge_id,
            user_id: "default".to_string(),
            badge_type: "first_task".to_string(),
            earned_at: now,
            metadata: Some(serde_json::json!({"milestone": 1}).to_string()),
        });
    }
    
    // task_master_100: total_tasks_completed >= 100
    if total_tasks_completed >= 100 && !earned_types.contains("task_master_100") {
        let badge_id = uuid::Uuid::new_v4().to_string();
        let metadata = serde_json::json!({"milestone": 100}).to_string();
        conn.execute(
            "INSERT INTO badges (id, user_id, badge_type, earned_at, metadata) VALUES (?1, 'default', 'task_master_100', ?2, ?3)",
            params![badge_id.clone(), now, metadata],
        ).map_err(|e| format!("Failed to award badge: {}", e))?;
        
        newly_awarded.push(Badge {
            id: badge_id,
            user_id: "default".to_string(),
            badge_type: "task_master_100".to_string(),
            earned_at: now,
            metadata: Some(serde_json::json!({"milestone": 100}).to_string()),
        });
    }
    
    // week_warrior: current_streak == 7
    if progress.current_streak == 7 && !earned_types.contains("week_warrior") {
        let badge_id = uuid::Uuid::new_v4().to_string();
        let metadata = serde_json::json!({"streak": 7}).to_string();
        conn.execute(
            "INSERT INTO badges (id, user_id, badge_type, earned_at, metadata) VALUES (?1, 'default', 'week_warrior', ?2, ?3)",
            params![badge_id.clone(), now, metadata],
        ).map_err(|e| format!("Failed to award badge: {}", e))?;
        
        newly_awarded.push(Badge {
            id: badge_id,
            user_id: "default".to_string(),
            badge_type: "week_warrior".to_string(),
            earned_at: now,
            metadata: Some(serde_json::json!({"streak": 7}).to_string()),
        });
    }
    
    // level_10: level == 10
    if progress.current_level == 10 && !earned_types.contains("level_10") {
        let badge_id = uuid::Uuid::new_v4().to_string();
        let metadata = serde_json::json!({"level": 10}).to_string();
        conn.execute(
            "INSERT INTO badges (id, user_id, badge_type, earned_at, metadata) VALUES (?1, 'default', 'level_10', ?2, ?3)",
            params![badge_id.clone(), now, metadata],
        ).map_err(|e| format!("Failed to award badge: {}", e))?;
        
        newly_awarded.push(Badge {
            id: badge_id,
            user_id: "default".to_string(),
            badge_type: "level_10".to_string(),
            earned_at: now,
            metadata: Some(serde_json::json!({"level": 10}).to_string()),
        });
    }
    
    Ok(newly_awarded)
}

// Helper function to get user progress from connection (internal use)
fn get_user_progress_internal(conn: &rusqlite::Connection) -> Result<UserProgress, String> {
    let result = conn.query_row(
        "SELECT id, total_xp, current_level, current_streak, longest_streak, last_completion_date, created_at, updated_at FROM user_progress WHERE id = 'default'",
        [],
        |row| {
            Ok(UserProgress {
                id: row.get(0)?,
                total_xp: row.get(1)?,
                current_level: row.get(2)?,
                current_streak: row.get(3)?,
                longest_streak: row.get(4)?,
                last_completion_date: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    );
    
    match result {
        Ok(progress) => Ok(progress),
        Err(_) => {
            // Create default user progress if it doesn't exist
            let now = now();
            conn.execute(
                "INSERT INTO user_progress (id, total_xp, current_level, current_streak, longest_streak, created_at, updated_at) VALUES ('default', 0, 1, 0, 0, ?1, ?2)",
                params![now, now],
            ).map_err(|e| format!("Failed to create user progress: {}", e))?;
            
            Ok(UserProgress {
                id: "default".to_string(),
                total_xp: 0,
                current_level: 1,
                current_streak: 0,
                longest_streak: 0,
                last_completion_date: None,
                created_at: now,
                updated_at: now,
            })
        }
    }
}

// Gamification commands
#[tauri::command]
pub fn get_user_progress(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<UserProgress, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    get_user_progress_internal(&db.conn)
}

#[tauri::command]
pub fn grant_xp(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    xp: i32,
    source: String,
    task_id: Option<String>,
) -> Result<GrantXpResult, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    grant_xp_internal(&db.conn, xp, source, task_id)
}

#[tauri::command]
pub fn update_streak(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<UserProgress, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    update_streak_internal(&db.conn)
}

#[tauri::command]
pub fn check_streak_on_startup(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<UserProgress, String> {
    update_streak(db)
}

#[tauri::command]
pub fn get_badges(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<Vec<Badge>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT id, user_id, badge_type, earned_at, metadata FROM badges WHERE user_id = 'default' ORDER BY earned_at DESC")
        .map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Badge {
            id: row.get(0)?,
            user_id: row.get(1)?,
            badge_type: row.get(2)?,
            earned_at: row.get(3)?,
            metadata: row.get(4)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut badges = Vec::new();
    for row in rows {
        badges.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(badges)
}

#[tauri::command]
pub fn check_and_award_badges(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<Vec<Badge>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    check_and_award_badges_internal(&db.conn)
}

// Translation data structures
#[derive(Debug, Serialize, Deserialize)]
pub struct TranslatedContent {
    pub title: String,
    pub description: Option<String>,
    pub source_lang: String,
    pub target_lang: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslationRequest {
    pub task_id: String,
    pub target_lang: String, // "en" or "tr"
}

// Translation commands
#[tauri::command]
pub async fn translate_task_content(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    request: TranslationRequest,
) -> Result<TranslatedContent, String> {
    // Get task and API key while holding the lock
    let (task, api_key) = {
        let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        let task = fetch_task(&db.conn, &request.task_id)?;
        let api_key = translation_service::get_api_key(&db.conn)?;
        (task, api_key)
    };
    
    // Detect source language (use title for detection)
    let source_lang = translation_service::detect_language(&task.title, api_key.as_deref()).await?;
    
    // Translate title
    let translated_title = {
        // Check cache and user translation first
        let maybe_cached = {
            let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
            translation_service::check_cache_and_user_translation(
                &db.conn,
                &task.title,
                &request.target_lang,
                "title",
                Some(&request.task_id),
            )?
        };
        
        if let Some(cached) = maybe_cached {
            cached
        } else {
            // Detect language first (no lock needed)
            let detected_lang = translation_service::detect_language(&task.title, api_key.as_deref()).await?;
            
            // Check regular cache
            let maybe_cached = {
                let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
                let source_text_hash = translation_service::hash_text(&task.title);
                translation_service::get_cached_translation(
                    &db.conn,
                    &source_text_hash,
                    &detected_lang,
                    &request.target_lang,
                    "title",
                )?
            };
            
            if let Some(cached) = maybe_cached {
                cached
            } else {
                // Do async translation
                let translated = translation_service::translate_text(
                    &task.title,
                    &request.target_lang,
                    api_key.as_deref(),
                )
                .await?;
                
                // Save to cache
                {
                    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
                    translation_service::save_translation(
                        &db.conn,
                        &task.title,
                        &detected_lang,
                        &request.target_lang,
                        &translated,
                        "title",
                        Some(&request.task_id),
                        false,
                    )?;
                }
                
                translated
            }
        }
    };
    
    // Translate description if present
    let translated_description = if let Some(desc) = &task.description {
        if !desc.trim().is_empty() {
            // Check cache and user translation first
            let maybe_cached = {
                let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
                translation_service::check_cache_and_user_translation(
                    &db.conn,
                    desc,
                    &request.target_lang,
                    "description",
                    Some(&request.task_id),
                )?
            };
            
            if let Some(cached) = maybe_cached {
                Some(cached)
            } else {
                // Detect language first (no lock needed)
                let detected_lang = translation_service::detect_language(desc, api_key.as_deref()).await?;
                
                // Check regular cache
                let maybe_cached = {
                    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
                    let source_text_hash = translation_service::hash_text(desc);
                    translation_service::get_cached_translation(
                        &db.conn,
                        &source_text_hash,
                        &detected_lang,
                        &request.target_lang,
                        "description",
                    )?
                };
                
                if let Some(cached) = maybe_cached {
                    Some(cached)
                } else {
                    // Do async translation
                    let translated = translation_service::translate_text(
                        desc,
                        &request.target_lang,
                        api_key.as_deref(),
                    )
                    .await?;
                    
                    // Save to cache
                    {
                        let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
                        translation_service::save_translation(
                            &db.conn,
                            desc,
                            &detected_lang,
                            &request.target_lang,
                            &translated,
                            "description",
                            Some(&request.task_id),
                            false,
                        )?;
                    }
                    
                    Some(translated)
                }
            }
        } else {
            None
        }
    } else {
        None
    };
    
    Ok(TranslatedContent {
        title: translated_title,
        description: translated_description,
        source_lang,
        target_lang: request.target_lang,
    })
}

#[tauri::command]
pub async fn save_translation_override(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
    field: String, // "title" or "description"
    target_lang: String,
    translated_text: String,
) -> Result<(), String> {
    // Get original text and API key while holding the lock
    let (source_text, api_key) = {
        let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        let task = fetch_task(&db.conn, &task_id)?;
        let source_text = match field.as_str() {
            "title" => task.title,
            "description" => task.description.unwrap_or_default(),
            _ => return Err("Invalid field type. Must be 'title' or 'description'".to_string()),
        };
        let api_key = translation_service::get_api_key(&db.conn)?;
        (source_text, api_key)
    };
    
    // Detect source language (release lock before await)
    let source_lang = translation_service::detect_language(&source_text, api_key.as_deref()).await
        .map_err(|e| format!("Failed to detect language: {}", e))?;
    
    // Save user-edited translation (re-lock for database write)
    {
        let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        translation_service::save_translation(
            &db.conn,
            &source_text,
            &source_lang,
            &target_lang,
            &translated_text,
            &field,
            Some(&task_id),
            true, // is_user_edited
        )?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_translation(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
    field: String, // "title" or "description"
    target_lang: String,
) -> Result<Option<String>, String> {
    // Check for user-edited translation and get source text while holding the lock
    let (source_text, api_key) = {
        let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        
        // First check for user-edited translation
        if let Ok(Some(user_trans)) = translation_service::get_user_translation(&db.conn, &task_id, &field, &target_lang) {
            return Ok(Some(user_trans));
        }
        
        // Get task to get source text
        let task = fetch_task(&db.conn, &task_id)?;
        let source_text = match field.as_str() {
            "title" => task.title,
            "description" => task.description.unwrap_or_default(),
            _ => return Err("Invalid field type. Must be 'title' or 'description'".to_string()),
        };
        
        if source_text.trim().is_empty() {
            return Ok(None);
        }
        
        let api_key = translation_service::get_api_key(&db.conn)?;
        (source_text, api_key)
    };
    
    // Detect source language (release lock before await)
    let source_lang = translation_service::detect_language(&source_text, api_key.as_deref()).await
        .map_err(|e| format!("Failed to detect language: {}", e))?;
    
    // Check cache (re-lock for database read)
    let source_text_hash = translation_service::hash_text(&source_text);
    let cached = {
        let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        translation_service::get_cached_translation(
            &db.conn,
            &source_text_hash,
            &source_lang,
            &target_lang,
            &field,
        )?
    };
    
    // If no cache, translate on the fly
    if cached.is_none() {
        let translated = translation_service::translate_text(
            &source_text,
            &target_lang,
            api_key.as_deref(),
        ).await?;
        
        // Save to cache
        {
            let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
            translation_service::save_translation(
                &db.conn,
                &source_text,
                &source_lang,
                &target_lang,
                &translated,
                &field,
                Some(&task_id),
                false,
            )?;
        }
        
        Ok(Some(translated))
    } else {
        Ok(cached)
    }
}

// Tag commands
#[tauri::command]
pub fn get_all_tags(db: State<'_, Arc<Mutex<DbConnection>>>) -> Result<Vec<Tag>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare(
        "SELECT id, name, color, created_at, usage_count FROM tags ORDER BY usage_count DESC, name"
    ).map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            usage_count: row.get(4)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tags = Vec::new();
    for row in rows {
        tags.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(tags)
}

#[tauri::command]
pub fn get_task_tags(db: State<'_, Arc<Mutex<DbConnection>>>, task_id: String) -> Result<Vec<Tag>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    fetch_task_tags(&db.conn, &task_id)
}

#[tauri::command]
pub fn create_tag(db: State<'_, Arc<Mutex<DbConnection>>>, input: CreateTagInput) -> Result<Tag, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Normalize tag name to lowercase and trim
    let normalized_name = input.name.trim().to_lowercase();
    
    if normalized_name.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }
    
    // Check if tag already exists
    let existing: Option<Tag> = db.conn.query_row(
        "SELECT id, name, color, created_at, usage_count FROM tags WHERE name = ?1",
        params![normalized_name],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
                usage_count: row.get(4)?,
            })
        },
    ).ok();
    
    if let Some(tag) = existing {
        return Ok(tag);
    }
    
    // Create new tag
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    db.conn.execute(
        "INSERT INTO tags (id, name, color, created_at, usage_count) VALUES (?1, ?2, ?3, ?4, 0)",
        params![id.clone(), normalized_name, input.color, now],
    ).map_err(|e| format!("Failed to create tag: {}", e))?;
    
    Ok(Tag {
        id,
        name: normalized_name,
        color: input.color,
        created_at: now,
        usage_count: 0,
    })
}

#[tauri::command]
pub fn delete_tag(db: State<'_, Arc<Mutex<DbConnection>>>, tagId: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // CASCADE will handle task_tags deletion
    db.conn.execute("DELETE FROM tags WHERE id = ?1", params![tagId])
        .map_err(|e| format!("Failed to delete tag: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn add_tag_to_task(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
    tag_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    // Add tag to task (ignore if already exists due to UNIQUE constraint)
    match db.conn.execute(
        "INSERT INTO task_tags (id, task_id, tag_id, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, task_id, tag_id.clone(), now],
    ) {
        Ok(_) => {
            // Increment usage count
            db.conn.execute(
                "UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?1",
                params![tag_id],
            ).map_err(|e| format!("Failed to update tag usage count: {}", e))?;
            Ok(())
        }
        Err(e) => {
            if e.to_string().contains("UNIQUE constraint failed") {
                Ok(()) // Tag already added, this is fine
            } else {
                Err(format!("Failed to add tag to task: {}", e))
            }
        }
    }
}

#[tauri::command]
pub fn remove_tag_from_task(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
    tag_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Remove tag from task
    let rows_affected = db.conn.execute(
        "DELETE FROM task_tags WHERE task_id = ?1 AND tag_id = ?2",
        params![task_id, tag_id.clone()],
    ).map_err(|e| format!("Failed to remove tag from task: {}", e))?;
    
    // Decrement usage count if a row was deleted
    if rows_affected > 0 {
        db.conn.execute(
            "UPDATE tags SET usage_count = MAX(0, usage_count - 1) WHERE id = ?1",
            params![tag_id],
        ).map_err(|e| format!("Failed to update tag usage count: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn get_suggested_tags(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    search: String,
) -> Result<Vec<Tag>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let search_pattern = format!("%{}%", search.trim().to_lowercase());
    
    let mut stmt = db.conn.prepare(
        "SELECT id, name, color, created_at, usage_count FROM tags 
         WHERE name LIKE ?1 
         ORDER BY usage_count DESC, name 
         LIMIT 10"
    ).map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map(params![search_pattern], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            usage_count: row.get(4)?,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tags = Vec::new();
    for row in rows {
        tags.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(tags)
}

#[tauri::command]
pub fn get_tasks_by_tag(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    tag_id: String,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare(
        "SELECT t.id, t.title, t.description, t.due_at, t.created_at, t.updated_at, t.priority, 
         t.completed_at, t.project_id, t.order_index, t.metadata, t.recurrence_type, 
         t.recurrence_interval, t.recurrence_parent_id, t.reminder_minutes_before, t.notification_repeat
         FROM tasks t
         INNER JOIN task_tags tt ON t.id = tt.task_id
         WHERE tt.tag_id = ?1
         ORDER BY t.order_index, t.created_at"
    ).map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map(params![tag_id], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: row.get(14).ok().flatten(),
            notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        let mut task = row.map_err(|e| format!("Row parsing error: {}", e))?;
        task.tags = Some(fetch_task_tags(&db.conn, &task.id)?);
        tasks.push(task);
    }
    
    Ok(tasks)
}

#[tauri::command]
pub fn get_tasks_by_tags(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    tag_ids: Vec<String>,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    if tag_ids.is_empty() {
        return Ok(Vec::new());
    }
    
    // Build query with placeholders for each tag_id
    let placeholders = tag_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let query = format!(
        "SELECT DISTINCT t.id, t.title, t.description, t.due_at, t.created_at, t.updated_at, t.priority, 
         t.completed_at, t.project_id, t.order_index, t.metadata, t.recurrence_type, 
         t.recurrence_interval, t.recurrence_parent_id, t.reminder_minutes_before, t.notification_repeat
         FROM tasks t
         INNER JOIN task_tags tt ON t.id = tt.task_id
         WHERE tt.tag_id IN ({})
         ORDER BY t.order_index, t.created_at",
        placeholders
    );
    
    let mut stmt = db.conn.prepare(&query).map_err(|e| format!("Query error: {}", e))?;
    let params: Vec<&dyn rusqlite::ToSql> = tag_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
    
    let rows = stmt.query_map(&params[..], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: row.get(14).ok().flatten(),
            notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        let mut task = row.map_err(|e| format!("Row parsing error: {}", e))?;
        task.tags = Some(fetch_task_tags(&db.conn, &task.id)?);
        tasks.push(task);
    }
    
    Ok(tasks)
}

// Task relationship commands
#[tauri::command]
pub fn create_task_relationship(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    input: CreateRelationshipInput,
) -> Result<TaskRelationship, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Prevent self-relationships
    if input.task_id_1 == input.task_id_2 {
        return Err("Cannot create relationship between a task and itself".to_string());
    }
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    let relationship_type = input.relationship_type.unwrap_or_else(|| "related".to_string());
    
    // Check for circular dependencies if relationship type is 'blocks'
    if relationship_type == "blocks" {
        if check_circular_dependency_internal(&db.conn, &input.task_id_1, &input.task_id_2)? {
            return Err("Cannot create blocking relationship: would create circular dependency".to_string());
        }
    }
    
    db.conn.execute(
        "INSERT INTO task_relationships (id, task_id_1, task_id_2, relationship_type, created_at) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id.clone(), input.task_id_1.clone(), input.task_id_2.clone(), relationship_type.clone(), now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            "Relationship already exists between these tasks".to_string()
        } else {
            format!("Failed to create task relationship: {}", e)
        }
    })?;
    
    Ok(TaskRelationship {
        id,
        task_id_1: input.task_id_1,
        task_id_2: input.task_id_2,
        relationship_type,
        created_at: now,
    })
}

#[tauri::command]
pub fn delete_task_relationship(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    relationship_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute(
        "DELETE FROM task_relationships WHERE id = ?1",
        params![relationship_id],
    ).map_err(|e| format!("Failed to delete task relationship: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_related_tasks(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get all tasks related to this task (bidirectional)
    let mut stmt = db.conn.prepare(
        "SELECT DISTINCT t.id, t.title, t.description, t.due_at, t.created_at, t.updated_at, t.priority, 
         t.completed_at, t.project_id, t.order_index, t.metadata, t.recurrence_type, 
         t.recurrence_interval, t.recurrence_parent_id, t.reminder_minutes_before, t.notification_repeat
         FROM tasks t
         WHERE t.id IN (
            SELECT task_id_2 FROM task_relationships WHERE task_id_1 = ?1
            UNION
            SELECT task_id_1 FROM task_relationships WHERE task_id_2 = ?1
         )
         ORDER BY t.order_index, t.created_at"
    ).map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: row.get(14).ok().flatten(),
            notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        let mut task = row.map_err(|e| format!("Row parsing error: {}", e))?;
        task.tags = Some(fetch_task_tags(&db.conn, &task.id)?);
        tasks.push(task);
    }
    
    Ok(tasks)
}

// Helper function to check circular dependencies
fn check_circular_dependency_internal(
    conn: &rusqlite::Connection,
    blocking_task_id: &str,
    blocked_task_id: &str,
) -> Result<bool, String> {
    // Check if adding this relationship would create a cycle
    // Use recursive CTE to traverse the dependency graph starting from blocked_task_id
    // If we can reach blocking_task_id, then creating this relationship would create a cycle
    let query = "
        WITH RECURSIVE dependency_chain(task_id, depth) AS (
            SELECT ?1 AS task_id, 0 AS depth
            UNION ALL
            SELECT tr.task_id_1, dc.depth + 1
            FROM task_relationships tr
            INNER JOIN dependency_chain dc ON tr.task_id_2 = dc.task_id
            WHERE tr.relationship_type = 'blocks' AND dc.depth < 100
        )
        SELECT COUNT(*) FROM dependency_chain WHERE task_id = ?2
    ";
    
    let count: i64 = conn.query_row(
        query,
        params![blocked_task_id, blocking_task_id],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to check circular dependency: {}", e))?;
    
    Ok(count > 0)
}

#[tauri::command]
pub fn check_circular_dependency(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    blocking_task_id: String,
    blocked_task_id: String,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    check_circular_dependency_internal(&db.conn, &blocking_task_id, &blocked_task_id)
}

#[tauri::command]
pub fn get_blocking_tasks(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get tasks that block this task (task_id_1 blocks task_id_2 where task_id_2 = task_id)
    let mut stmt = db.conn.prepare(
        "SELECT DISTINCT t.id, t.title, t.description, t.due_at, t.created_at, t.updated_at, t.priority, 
         t.completed_at, t.project_id, t.order_index, t.metadata, t.recurrence_type, 
         t.recurrence_interval, t.recurrence_parent_id, t.reminder_minutes_before, t.notification_repeat
         FROM tasks t
         INNER JOIN task_relationships tr ON t.id = tr.task_id_1
         WHERE tr.task_id_2 = ?1 AND tr.relationship_type = 'blocks'
         ORDER BY t.order_index, t.created_at"
    ).map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: row.get(14).ok().flatten(),
            notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        let mut task = row.map_err(|e| format!("Row parsing error: {}", e))?;
        task.tags = Some(fetch_task_tags(&db.conn, &task.id)?);
        tasks.push(task);
    }
    
    Ok(tasks)
}

#[tauri::command]
pub fn get_blocked_tasks(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    task_id: String,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get tasks blocked by this task (task_id_1 blocks task_id_2 where task_id_1 = task_id)
    let mut stmt = db.conn.prepare(
        "SELECT DISTINCT t.id, t.title, t.description, t.due_at, t.created_at, t.updated_at, t.priority, 
         t.completed_at, t.project_id, t.order_index, t.metadata, t.recurrence_type, 
         t.recurrence_interval, t.recurrence_parent_id, t.reminder_minutes_before, t.notification_repeat
         FROM tasks t
         INNER JOIN task_relationships tr ON t.id = tr.task_id_2
         WHERE tr.task_id_1 = ?1 AND tr.relationship_type = 'blocks'
         ORDER BY t.order_index, t.created_at"
    ).map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            due_date: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            priority: row.get(6)?,
            completed: row.get::<_, Option<i64>>(7)?.is_some(),
            project_id: row.get(8)?,
            order_index: row.get(9).unwrap_or(0),
            recurrence_type: row.get(11).unwrap_or_else(|_| "none".to_string()),
            recurrence_interval: row.get(12).unwrap_or(1),
            recurrence_parent_id: row.get(13).ok(),
            reminder_minutes_before: row.get(14).ok().flatten(),
            notification_repeat: row.get::<_, Option<i32>>(15).unwrap_or(None).map_or(false, |x| x != 0),
            tags: None,
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        let mut task = row.map_err(|e| format!("Row parsing error: {}", e))?;
        task.tags = Some(fetch_task_tags(&db.conn, &task.id)?);
        tasks.push(task);
    }
    
    Ok(tasks)
}

// Pomodoro session commands
#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePomodoroSessionInput {
    pub task_id: Option<String>,
    pub started_at: i64,
    pub completed_at: i64,
    pub duration_seconds: i32,
    pub mode: String,
    pub was_completed: bool,
    pub task_completed: bool,
}

#[tauri::command]
pub fn create_pomodoro_session(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    input: CreatePomodoroSessionInput,
) -> Result<pomodoro_service::PomodoroSession, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    pomodoro_service::create_pomodoro_session(
        &db.conn,
        input.task_id,
        input.started_at,
        input.completed_at,
        input.duration_seconds,
        input.mode,
        input.was_completed,
        input.task_completed,
    )
    .map_err(|e| format!("Failed to create pomodoro session: {}", e))
}

#[tauri::command]
pub fn get_pomodoro_stats(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    start_date: Option<i64>,
    end_date: Option<i64>,
) -> Result<pomodoro_service::PomodoroStats, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    pomodoro_service::get_pomodoro_stats(&db.conn, start_date, end_date)
        .map_err(|e| format!("Failed to get pomodoro stats: {}", e))
}

#[tauri::command]
pub fn get_daily_pomodoro_stats(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    start_date: i64,
    end_date: i64,
) -> Result<Vec<pomodoro_service::DailyPomodoroStats>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    pomodoro_service::get_daily_stats(&db.conn, start_date, end_date)
        .map_err(|e| format!("Failed to get daily pomodoro stats: {}", e))
}

#[tauri::command]
pub fn get_best_focus_times(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<Vec<pomodoro_service::BestFocusTime>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    pomodoro_service::get_best_focus_times(&db.conn)
        .map_err(|e| format!("Failed to get best focus times: {}", e))
}

#[tauri::command]
pub fn get_task_completion_rates(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<Vec<pomodoro_service::TaskCompletionRate>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    pomodoro_service::get_task_completion_rates(&db.conn)
        .map_err(|e| format!("Failed to get task completion rates: {}", e))
}

#[tauri::command]
pub fn get_pomodoro_streak(
    db: State<'_, Arc<Mutex<DbConnection>>>,
) -> Result<pomodoro_service::PomodoroStreak, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    pomodoro_service::get_pomodoro_streak(&db.conn)
        .map_err(|e| format!("Failed to get pomodoro streak: {}", e))
}
