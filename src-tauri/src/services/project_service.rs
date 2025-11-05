use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::commands::{CreateProjectInput, Project, UpdateProjectInput};

// Helper function to get current timestamp
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub fn get_projects(conn: &rusqlite::Connection) -> Result<Vec<Project>, String> {
    let mut stmt = conn.prepare("SELECT id, name, color, created_at, updated_at FROM projects ORDER BY created_at").map_err(|e| format!("Query error: {}", e))?;
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

pub fn create_project(conn: &rusqlite::Connection, input: CreateProjectInput) -> Result<Project, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now();
    
    conn.execute(
        "INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id.clone(), input.name, input.color, now, now],
    ).map_err(|e| format!("Failed to create project: {}", e))?;
    
    conn.query_row(
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

pub fn update_project(conn: &rusqlite::Connection, id: &str, input: UpdateProjectInput) -> Result<Project, String> {
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
        query_params.push(Box::new(id.to_string()));
        
        let query = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
        conn.execute(&query, rusqlite::params_from_iter(query_params.iter()))
            .map_err(|e| format!("Failed to update project: {}", e))?;
    }
    
    conn.query_row(
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

pub fn delete_project(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    
    Ok(())
}

