use crate::db::DbConnection;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
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
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskFilter {
    pub project_id: Option<String>,
    pub completed: Option<bool>,
    pub due_before: Option<i64>,
    pub due_after: Option<i64>,
    pub search: Option<String>,
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

// Helper function to fetch a task by ID (assumes lock is already held)
fn fetch_task(conn: &rusqlite::Connection, id: &str) -> Result<Task, String> {
    conn.query_row(
        "SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id FROM tasks WHERE id = ?1",
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
            })
        },
    ).map_err(|e| format!("Task not found: {}", e))
}

// Task commands
#[tauri::command]
pub fn get_tasks(
    db: State<'_, Mutex<DbConnection>>,
    filter: Option<TaskFilter>,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut query = "SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id FROM tasks WHERE 1=1".to_string();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(f) = filter {
        if let Some(project_id) = f.project_id {
            query.push_str(" AND project_id = ?");
            query_params.push(Box::new(project_id));
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
        if let Some(search) = f.search {
            query.push_str(" AND (title LIKE ? OR description LIKE ?)");
            let search_pattern = format!("%{}%", search);
            query_params.push(Box::new(search_pattern.clone()));
            query_params.push(Box::new(search_pattern));
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
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        tasks.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(tasks)
}

#[tauri::command]
pub fn get_task(db: State<'_, Mutex<DbConnection>>, id: String) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    fetch_task(&db.conn, &id)
}

#[tauri::command]
pub fn create_task(
    db: State<'_, Mutex<DbConnection>>,
    input: CreateTaskInput,
) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    db.conn.execute(
        "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
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
            None::<String>
        ],
    ).map_err(|e| format!("Failed to create task: {}", e))?;
    
    fetch_task(&db.conn, &id)
}

#[tauri::command]
pub fn update_task(
    db: State<'_, Mutex<DbConnection>>,
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
    
    if updates.is_empty() {
        return fetch_task(&db.conn, &id);
    }
    
    updates.push("updated_at = ?");
    query_params.push(Box::new(now));
    query_params.push(Box::new(id.clone()));
    
    let query = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));
    db.conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
        .map_err(|e| format!("Failed to update task: {}", e))?;
    
    fetch_task(&db.conn, &id)
}

#[tauri::command]
pub fn delete_task(db: State<'_, Mutex<DbConnection>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete task: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn toggle_complete(
    db: State<'_, Mutex<DbConnection>>,
    id: String,
) -> Result<Task, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get current task state
    let task_info: (Option<i64>, String, i32) = db.conn.query_row(
        "SELECT completed_at, recurrence_type, recurrence_interval FROM tasks WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| format!("Task not found: {}", e))?;
    
    let (completed, recurrence_type, recurrence_interval) = task_info;
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
pub fn get_projects(db: State<'_, Mutex<DbConnection>>) -> Result<Vec<Project>, String> {
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
    db: State<'_, Mutex<DbConnection>>,
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
    db: State<'_, Mutex<DbConnection>>,
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
pub fn delete_project(db: State<'_, Mutex<DbConnection>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    
    Ok(())
}

// Subtask commands
#[tauri::command]
pub fn add_subtask(
    db: State<'_, Mutex<DbConnection>>,
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
    db: State<'_, Mutex<DbConnection>>,
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
pub fn delete_subtask(db: State<'_, Mutex<DbConnection>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute("DELETE FROM subtasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete subtask: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_subtasks(
    db: State<'_, Mutex<DbConnection>>,
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
    db: State<'_, Mutex<DbConnection>>,
    task_id: String,
) -> Result<Vec<Attachment>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = db.conn.prepare("SELECT id, task_id, filename, path, mime, created_at FROM attachments WHERE task_id = ?1 ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            task_id: row.get(1)?,
            filename: row.get(2)?,
            path: row.get(3)?,
            mime: row.get(4)?,
            created_at: row.get(5)?,
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
    db: State<'_, Mutex<DbConnection>>,
    app_handle: tauri::AppHandle,
    task_id: String,
    file_path: String,
) -> Result<Attachment, String> {
    use crate::attachments::copy_attachment_to_storage;
    
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Copy file to storage
    let stored_path = copy_attachment_to_storage(&app_handle, &file_path, &task_id)
        .map_err(|e| format!("Failed to copy attachment: {}", e))?;
    
    // Get filename from original path
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    // Guess MIME type from extension
    let mime = std::path::Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .and_then(|ext| match ext.to_lowercase().as_str() {
            "pdf" => Some("application/pdf"),
            "jpg" | "jpeg" => Some("image/jpeg"),
            "png" => Some("image/png"),
            "gif" => Some("image/gif"),
            "txt" => Some("text/plain"),
            _ => None,
        });
    
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = now();
    
    db.conn.execute(
        "INSERT INTO attachments (id, task_id, filename, path, mime, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id.clone(), task_id, filename, stored_path, mime, created_at],
    ).map_err(|e| format!("Failed to create attachment record: {}", e))?;
    
    db.conn.query_row(
        "SELECT id, task_id, filename, path, mime, created_at FROM attachments WHERE id = ?1",
        params![id],
        |row| {
            Ok(Attachment {
                id: row.get(0)?,
                task_id: row.get(1)?,
                filename: row.get(2)?,
                path: row.get(3)?,
                mime: row.get(4)?,
                created_at: row.get(5)?,
            })
        },
    ).map_err(|e| format!("Failed to fetch created attachment: {}", e))
}

#[tauri::command]
pub fn delete_attachment(
    db: State<'_, Mutex<DbConnection>>,
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

// Settings commands
#[tauri::command]
pub fn get_settings(db: State<'_, Mutex<DbConnection>>) -> Result<HashMap<String, String>, String> {
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
    db: State<'_, Mutex<DbConnection>>,
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
    db: State<'_, Mutex<DbConnection>>,
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
    let mut stmt = db.conn.prepare("SELECT id, task_id, filename, path, mime, created_at FROM attachments ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            task_id: row.get(1)?,
            filename: row.get(2)?,
            path: row.get(3)?,
            mime: row.get(4)?,
            created_at: row.get(5)?,
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
    db: State<'_, Mutex<DbConnection>>,
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

// Auto-start commands (basic implementation - stores setting, actual autostart would need OS-specific code)
#[tauri::command]
pub fn get_autostart_enabled(db: State<'_, Mutex<DbConnection>>) -> Result<bool, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let enabled: Option<String> = db.conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params!["autostart_enabled"],
        |row| row.get(0),
    ).ok();
    
    Ok(enabled.as_deref() == Some("true"))
}

#[tauri::command]
pub fn set_autostart_enabled(
    db: State<'_, Mutex<DbConnection>>,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    db.conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params!["autostart_enabled", enabled.to_string()],
    ).map_err(|e| format!("Failed to update autostart setting: {}", e))?;
    
    // Note: Actual OS-specific autostart implementation would go here
    // For Windows: Modify registry or create shortcut in Startup folder
    // For macOS: Use LaunchAgent
    // For Linux: Use .desktop file in ~/.config/autostart/
    
    Ok(())
}
