use rusqlite::params;
use serde::{Deserialize, Serialize};

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

// Helper function to get current timestamp
fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub fn create_template(
    conn: &rusqlite::Connection,
    name: String,
    title: String,
    description: Option<String>,
    priority: String,
    project_id: Option<String>,
) -> Result<Template, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    conn.execute(
        "INSERT INTO task_templates (id, name, title, description, priority, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id.clone(), name, title, description, priority, project_id, now, now],
    ).map_err(|e| format!("Failed to create template: {}", e))?;
    
    get_template(conn, &id)
}

pub fn get_templates(conn: &rusqlite::Connection) -> Result<Vec<Template>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, title, description, priority, project_id, created_at, updated_at FROM task_templates ORDER BY created_at DESC")
        .map_err(|e| format!("Query error: {}", e))?;
    
    let rows = stmt
        .query_map([], |row| {
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
        })
        .map_err(|e| format!("Query execution error: {}", e))?;
    
    let mut templates = Vec::new();
    for row in rows {
        templates.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }
    
    Ok(templates)
}

pub fn get_template(conn: &rusqlite::Connection, id: &str) -> Result<Template, String> {
    conn.query_row(
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
    )
    .map_err(|e| format!("Template not found: {}", e))
}

pub fn update_template(
    conn: &rusqlite::Connection,
    id: &str,
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    priority: Option<String>,
    project_id: Option<String>,
) -> Result<Template, String> {
    let now = now();
    let mut updates = Vec::new();
    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(name) = name {
        updates.push("name = ?");
        query_params.push(Box::new(name));
    }
    if let Some(title) = title {
        updates.push("title = ?");
        query_params.push(Box::new(title));
    }
    if let Some(description) = description {
        updates.push("description = ?");
        query_params.push(Box::new(description));
    }
    if let Some(priority) = priority {
        updates.push("priority = ?");
        query_params.push(Box::new(priority));
    }
    if let Some(project_id) = project_id {
        updates.push("project_id = ?");
        query_params.push(Box::new(project_id));
    }
    
    if updates.is_empty() {
        return get_template(conn, id);
    }
    
    updates.push("updated_at = ?");
    query_params.push(Box::new(now));
    query_params.push(Box::new(id.to_string()));
    
    let query = format!("UPDATE task_templates SET {} WHERE id = ?", updates.join(", "));
    conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
        .map_err(|e| format!("Failed to update template: {}", e))?;
    
    get_template(conn, id)
}

pub fn delete_template(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM task_templates WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete template: {}", e))?;
    
    Ok(())
}

