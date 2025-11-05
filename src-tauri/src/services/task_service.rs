use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::commands::{CreateTaskInput, Task, TaskFilter, UpdateTaskInput};

// Helper function to get current timestamp
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

// Helper function to fetch a task by ID
pub fn fetch_task(conn: &rusqlite::Connection, id: &str) -> Result<Task, String> {
    conn.query_row(
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
            })
        },
    ).map_err(|e| format!("Task not found: {}", e))
}

pub fn get_tasks(conn: &rusqlite::Connection, filter: Option<TaskFilter>) -> Result<Vec<Task>, String> {
    let mut query = "SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata, recurrence_type, recurrence_interval, recurrence_parent_id, reminder_minutes_before, notification_repeat FROM tasks WHERE 1=1".to_string();
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
    
    let mut stmt = conn.prepare(&query).map_err(|e| format!("Query error: {}", e))?;
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
        })
    }).map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut tasks = Vec::new();
    for row in rows {
        tasks.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(tasks)
}

pub fn create_task(conn: &rusqlite::Connection, input: CreateTaskInput) -> Result<Task, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    conn.execute(
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
    
    fetch_task(conn, &id)
}

pub fn update_task(conn: &rusqlite::Connection, id: &str, input: UpdateTaskInput) -> Result<Task, String> {
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
        return fetch_task(conn, id);
    }
    
    updates.push("updated_at = ?");
    query_params.push(Box::new(now));
    query_params.push(Box::new(id.to_string()));
    
    let query = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));
    conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
        .map_err(|e| format!("Failed to update task: {}", e))?;
    
    fetch_task(conn, id)
}

pub fn delete_task(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete task: {}", e))?;
    
    Ok(())
}

pub fn toggle_complete(conn: &rusqlite::Connection, id: &str) -> Result<Task, String> {
    // Get current task state
    let task_info: (Option<i64>, String, i32) = conn.query_row(
        "SELECT completed_at, recurrence_type, recurrence_interval FROM tasks WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| format!("Task not found: {}", e))?;
    
    let (completed, recurrence_type, recurrence_interval) = task_info;
    let now = now();
    let new_completed = if completed.is_some() { None } else { Some(now) };
    
    conn.execute(
        "UPDATE tasks SET completed_at = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_completed, now, id],
    ).map_err(|e| format!("Failed to toggle complete: {}", e))?;
    
    // If task is being marked complete and has recurrence, create new instance
    if new_completed.is_some() && recurrence_type != "none" {
        create_recurring_instance(conn, id, &recurrence_type, recurrence_interval)?;
    }
    
    fetch_task(conn, id)
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
    
    // Calculate next due date based on recurrence type
    let next_due_date = match recurrence_type {
        "daily" => due_date.map(|d| d + (interval as i64 * 24 * 60 * 60)),
        "weekly" => due_date.map(|d| d + (interval as i64 * 7 * 24 * 60 * 60)),
        "monthly" => due_date.map(|d| d + (interval as i64 * 30 * 24 * 60 * 60)),
        _ => due_date,
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
            next_due_date,
            now,
            now,
            priority,
            None::<i64>,
            project_id,
            order_index,
            None::<String>,
            recurrence_type,
            interval,
            parent_id,
        ],
    ).map_err(|e| format!("Failed to create recurring instance: {}", e))?;
    
    Ok(())
}

