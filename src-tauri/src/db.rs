use rusqlite::{Connection, Result as SqlResult, params};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct DbConnection {
    pub conn: Connection,
}

impl DbConnection {
    pub fn new(db_path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;
        Ok(Self { conn })
    }
}

pub fn init_db(app_handle: &tauri::AppHandle) -> anyhow::Result<DbConnection> {
    // Get app data directory
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| anyhow::anyhow!("Failed to get app data directory"))?;
    
    // Create data directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)?;
    
    // Open database connection
    let db_path = app_data_dir.join("todo.db");
    let db = DbConnection::new(db_path)?;
    
    // Run migrations
    run_migrations(&db.conn, app_handle)?;
    
    // Seed initial data if needed
    seed_initial_data(&db.conn)?;
    
    Ok(db)
}

fn run_migrations(conn: &Connection, app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    // Create migrations table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at INTEGER NOT NULL
        )",
        [],
    )?;
    
    // Get list of applied migrations
    let mut stmt = conn.prepare("SELECT name FROM migrations ORDER BY name")?;
    let applied: Vec<String> = stmt.query_map([], |row| Ok(row.get(0)?))?.collect::<SqlResult<Vec<String>>>()?;
    
    // Get migration files - try multiple paths
    let migrations_dir = app_handle
        .path_resolver()
        .resource_dir()
        .map(|d| d.join("migrations"))
        .or_else(|| {
            // Fallback 1: try src-tauri/migrations relative to current dir
            std::env::current_dir()
                .ok()?
                .join("src-tauri")
                .join("migrations")
                .canonicalize()
                .ok()
        })
        .or_else(|| {
            // Fallback 2: try from executable path
            std::env::current_exe()
                .ok()?
                .parent()
                .map(|p| p.join("migrations"))
                .filter(|p| p.exists())
        });
    
    let mut migration_files: Vec<String> = Vec::new();
    if let Some(ref migrations_dir) = migrations_dir {
        if migrations_dir.exists() {
            if let Ok(entries) = fs::read_dir(migrations_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("sql") {
                        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                            migration_files.push(file_name.to_string());
                        }
                    }
                }
                migration_files.sort();
            }
        }
    }
    
    // Apply pending migrations
    if let Some(ref migrations_dir) = migrations_dir {
        for migration_file in migration_files {
            if !applied.contains(&migration_file) {
                let migration_path = migrations_dir.join(&migration_file);
                if let Ok(sql) = fs::read_to_string(&migration_path) {
                    // Execute migration in a transaction
                    let tx = conn.unchecked_transaction()?;
                    
                    // For migration 0004_add_recurrence.sql, check if columns exist first
                    if migration_file == "0004_add_recurrence.sql" {
                        // Check if recurrence columns already exist
                        let columns: Vec<String> = tx
                            .prepare("SELECT name FROM pragma_table_info('tasks')")?
                            .query_map([], |row| Ok(row.get::<_, String>(0)?))?
                            .collect::<SqlResult<Vec<String>>>()?;
                        
                        let has_recurrence_type = columns.contains(&"recurrence_type".to_string());
                        let has_recurrence_interval = columns.contains(&"recurrence_interval".to_string());
                        let has_recurrence_parent_id = columns.contains(&"recurrence_parent_id".to_string());
                        
                        // Only execute ALTER TABLE statements for missing columns
                        if !has_recurrence_type {
                            tx.execute("ALTER TABLE tasks ADD COLUMN recurrence_type TEXT DEFAULT 'none'", [])?;
                        }
                        if !has_recurrence_interval {
                            tx.execute("ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1", [])?;
                        }
                        if !has_recurrence_parent_id {
                            tx.execute("ALTER TABLE tasks ADD COLUMN recurrence_parent_id TEXT", [])?;
                        }
                    } else if migration_file == "0008_add_attachment_size.sql" {
                        // Check if size column already exists in attachments table
                        let columns: Vec<String> = tx
                            .prepare("SELECT name FROM pragma_table_info('attachments')")?
                            .query_map([], |row| Ok(row.get::<_, String>(0)?))?
                            .collect::<SqlResult<Vec<String>>>()?;
                        
                        if !columns.contains(&"size".to_string()) {
                            tx.execute("ALTER TABLE attachments ADD COLUMN size INTEGER", [])?;
                        }
                    } else if migration_file == "0006_add_notification_preferences.sql" {
                        // Check if notification columns already exist
                        let columns: Vec<String> = tx
                            .prepare("SELECT name FROM pragma_table_info('tasks')")?
                            .query_map([], |row| Ok(row.get::<_, String>(0)?))?
                            .collect::<SqlResult<Vec<String>>>()?;
                        
                        let has_reminder_minutes_before = columns.contains(&"reminder_minutes_before".to_string());
                        let has_notification_repeat = columns.contains(&"notification_repeat".to_string());
                        
                        // Only execute ALTER TABLE statements for missing columns
                        if !has_reminder_minutes_before {
                            tx.execute("ALTER TABLE tasks ADD COLUMN reminder_minutes_before INTEGER DEFAULT NULL", [])?;
                        }
                        if !has_notification_repeat {
                            tx.execute("ALTER TABLE tasks ADD COLUMN notification_repeat INTEGER DEFAULT 0", [])?;
                        }
                        
                        // Create notification_schedule table if it doesn't exist
                        tx.execute_batch(
                            "CREATE TABLE IF NOT EXISTS notification_schedule (
                                id TEXT PRIMARY KEY NOT NULL,
                                task_id TEXT NOT NULL,
                                scheduled_at INTEGER NOT NULL,
                                snooze_until INTEGER,
                                created_at INTEGER NOT NULL,
                                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                            );
                            CREATE INDEX IF NOT EXISTS idx_notification_schedule_scheduled_at ON notification_schedule(scheduled_at);
                            CREATE INDEX IF NOT EXISTS idx_notification_schedule_task_id ON notification_schedule(task_id);"
                        )?;
                    } else {
                        // For other migrations, execute SQL as-is
                        tx.execute_batch(&sql)?;
                    }
                    
                    // Record migration
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64;
                    tx.execute(
                        "INSERT INTO migrations (name, applied_at) VALUES (?1, ?2)",
                        [&migration_file, &now.to_string()],
                    )?;
                    
                    tx.commit()?;
                }
            }
        }
    }
    
    // Ensure attachments table exists and size column exists even if migration wasn't found/applied
    // This is a safety check to handle cases where migration system fails
    {
        let attachments_table_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='attachments'",
            [],
            |row| Ok(row.get::<_, i64>(0)? > 0),
        )?;
        
        if attachments_table_exists {
            let columns: Vec<String> = conn
                .prepare("SELECT name FROM pragma_table_info('attachments')")?
                .query_map([], |row| Ok(row.get::<_, String>(0)?))?
                .collect::<SqlResult<Vec<String>>>()?;
            
            if !columns.contains(&"size".to_string()) {
                conn.execute("ALTER TABLE attachments ADD COLUMN size INTEGER", [])?;
            }
        } else {
            // Create attachments table if it doesn't exist
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS attachments (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    path TEXT NOT NULL,
                    mime TEXT,
                    size INTEGER,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);"
            )?;
        }
    }
    
    // Ensure recurrence columns exist even if migration wasn't found/applied
    // This is a safety check to handle cases where migration system fails
    let tables_exist: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tasks'",
        [],
        |row| Ok(row.get::<_, i64>(0)? > 0),
    )?;
    
    if tables_exist {
        // Check if recurrence columns exist
        let columns: Vec<String> = conn
            .prepare("SELECT name FROM pragma_table_info('tasks')")?
            .query_map([], |row| Ok(row.get::<_, String>(0)?))?
            .collect::<SqlResult<Vec<String>>>()?;
        
        let has_recurrence_type = columns.contains(&"recurrence_type".to_string());
        let has_recurrence_interval = columns.contains(&"recurrence_interval".to_string());
        let has_recurrence_parent_id = columns.contains(&"recurrence_parent_id".to_string());
        
        // Add missing columns
        if !has_recurrence_type {
            conn.execute("ALTER TABLE tasks ADD COLUMN recurrence_type TEXT DEFAULT 'none'", [])
                .map_err(|e| anyhow::anyhow!("Failed to add recurrence_type column: {}", e))?;
        }
        if !has_recurrence_interval {
            conn.execute("ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1", [])
                .map_err(|e| anyhow::anyhow!("Failed to add recurrence_interval column: {}", e))?;
        }
        if !has_recurrence_parent_id {
            conn.execute("ALTER TABLE tasks ADD COLUMN recurrence_parent_id TEXT", [])
                .map_err(|e| anyhow::anyhow!("Failed to add recurrence_parent_id column: {}", e))?;
        }
        
        // Check if notification columns exist
        let has_reminder_minutes_before = columns.contains(&"reminder_minutes_before".to_string());
        let has_notification_repeat = columns.contains(&"notification_repeat".to_string());
        
        // Add missing notification columns
        if !has_reminder_minutes_before {
            conn.execute("ALTER TABLE tasks ADD COLUMN reminder_minutes_before INTEGER DEFAULT NULL", [])
                .map_err(|e| anyhow::anyhow!("Failed to add reminder_minutes_before column: {}", e))?;
        }
        if !has_notification_repeat {
            conn.execute("ALTER TABLE tasks ADD COLUMN notification_repeat INTEGER DEFAULT 0", [])
                .map_err(|e| anyhow::anyhow!("Failed to add notification_repeat column: {}", e))?;
        }
        
        // Ensure task_templates table exists (fallback if migration 0005 wasn't applied)
        let templates_table_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='task_templates'",
            [],
            |row| Ok(row.get::<_, i64>(0)? > 0),
        )?;
        
        if !templates_table_exists {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS task_templates (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    priority TEXT NOT NULL DEFAULT 'medium',
                    project_id TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_templates_name ON task_templates(name);
                CREATE INDEX IF NOT EXISTS idx_templates_created ON task_templates(created_at);"
            ).map_err(|e| anyhow::anyhow!("Failed to create task_templates table: {}", e))?;
        }
        
        // Ensure gamification tables exist (fallback if migration 0007 wasn't applied)
        let user_progress_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_progress'",
            [],
            |row| Ok(row.get::<_, i64>(0)? > 0),
        )?;
        
        if !user_progress_exists {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
            
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS user_progress (
                    id TEXT PRIMARY KEY DEFAULT 'default',
                    total_xp INTEGER NOT NULL DEFAULT 0,
                    current_level INTEGER NOT NULL DEFAULT 1,
                    current_streak INTEGER NOT NULL DEFAULT 0,
                    longest_streak INTEGER NOT NULL DEFAULT 0,
                    last_completion_date INTEGER,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS badges (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT 'default',
                    badge_type TEXT NOT NULL,
                    earned_at INTEGER NOT NULL,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS xp_history (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT 'default',
                    xp_amount INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    task_id TEXT,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE,
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
                CREATE INDEX IF NOT EXISTS idx_badges_badge_type ON badges(badge_type);
                CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);
                CREATE INDEX IF NOT EXISTS idx_xp_history_created_at ON xp_history(created_at);
                CREATE INDEX IF NOT EXISTS idx_xp_history_source ON xp_history(source);"
            ).map_err(|e| anyhow::anyhow!("Failed to create gamification tables: {}", e))?;
            
            // Initialize default user progress
            conn.execute(
                "INSERT OR IGNORE INTO user_progress (id, total_xp, current_level, current_streak, longest_streak, created_at, updated_at) VALUES ('default', 0, 1, 0, 0, ?1, ?2)",
                params![now, now],
            ).map_err(|e| anyhow::anyhow!("Failed to initialize user progress: {}", e))?;
        }
    }
    
    // Fallback: if no migrations were applied and tables don't exist, create them directly
    if !tables_exist && applied.is_empty() {
        // Create tables directly as fallback
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                due_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                completed_at INTEGER,
                project_id TEXT,
                order_index INTEGER DEFAULT 0,
                metadata TEXT,
                recurrence_type TEXT DEFAULT 'none',
                recurrence_interval INTEGER DEFAULT 1,
                recurrence_parent_id TEXT,
                reminder_minutes_before INTEGER DEFAULT NULL,
                notification_repeat INTEGER DEFAULT 0,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subtasks (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                mime TEXT,
                size INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
            CREATE TABLE IF NOT EXISTS task_templates (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT NOT NULL DEFAULT 'medium',
                project_id TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_templates_name ON task_templates(name);
            CREATE INDEX IF NOT EXISTS idx_templates_created ON task_templates(created_at);"
        )?;
    }
    
    Ok(())
}

fn seed_initial_data(conn: &Connection) -> anyhow::Result<()> {
    // Check if tasks table exists
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tasks'",
        [],
        |row| Ok(row.get::<_, i64>(0)? > 0),
    )?;
    
    if !table_exists {
        return Ok(()); // Tables don't exist yet, skip seeding
    }
    
    // Check if tasks table is empty
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))?;
    
    if count > 0 {
        return Ok(()); // Already seeded
    }
    
    // Get current timestamp
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    // Seed mock tasks from Phase 1
    let mock_tasks = vec![
        ("Complete project setup", false, Some(now), "high"),
        ("Review design mockups", false, Some(now + 2 * 86400), "medium"),
        ("Write documentation", true, Some(now - 86400), "low"),
        ("Schedule team meeting", false, Some(now + 5 * 86400), "medium"),
        ("Fix bug in authentication", true, Some(now), "high"),
    ];
    
    let tx = conn.unchecked_transaction()?;
    
    for (title, completed, due_at, priority) in mock_tasks {
        let id = uuid::Uuid::new_v4().to_string();
        let completed_at = if completed { Some(now) } else { None };
        
        tx.execute(
            "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                id,
                title,
                None::<String>,
                due_at,
                now,
                now,
                priority,
                completed_at,
                None::<String>,
                0,
                None::<String>
            ],
        )?;
    }
    
    tx.commit()?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use uuid::Uuid;
    
    fn setup_test_db() -> (TempDir, DbConnection) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db = DbConnection::new(db_path.clone()).unwrap();
        
        // Create migrations table
        db.conn.execute(
            "CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at INTEGER NOT NULL
            )",
            [],
        ).unwrap();
        
        // Run migrations manually for testing
        db.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                due_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                completed_at INTEGER,
                project_id TEXT,
                order_index INTEGER DEFAULT 0,
                metadata TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subtasks (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                mime TEXT,
                size INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );"
        ).unwrap();
        
        (temp_dir, db)
    }
    
    #[test]
    fn test_db_initialization() {
        let (_temp_dir, db) = setup_test_db();
        
        // Verify migrations table exists
        let count: i64 = db.conn
            .query_row("SELECT COUNT(*) FROM migrations", [], |row| row.get(0))
            .unwrap();
        assert!(count >= 0);
        
        // Verify tables exist
        let tables: Vec<String> = db.conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .unwrap()
            .query_map([], |row| Ok(row.get(0)?))
            .unwrap()
            .collect::<SqlResult<Vec<String>>>()
            .unwrap();
        
        assert!(tables.contains(&"tasks".to_string()));
        assert!(tables.contains(&"projects".to_string()));
        assert!(tables.contains(&"settings".to_string()));
        assert!(tables.contains(&"subtasks".to_string()));
        assert!(tables.contains(&"attachments".to_string()));
    }
    
    #[test]
    fn test_task_crud() {
        let (_temp_dir, db) = setup_test_db();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        // Create task
        let task_id = Uuid::new_v4().to_string();
        db.conn.execute(
            "INSERT INTO tasks (id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                task_id.clone(),
                "Test Task",
                "Test Description",
                Some(now + 86400),
                now,
                now,
                "high",
                None::<i64>,
                None::<String>,
                0,
                None::<String>
            ],
        ).unwrap();
        
        // Read task
        let title: String = db.conn.query_row(
            "SELECT title FROM tasks WHERE id = ?1",
            params![task_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(title, "Test Task");
        
        // Update task
        db.conn.execute(
            "UPDATE tasks SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params!["Updated Task", now + 1, task_id],
        ).unwrap();
        
        let updated_title: String = db.conn.query_row(
            "SELECT title FROM tasks WHERE id = ?1",
            params![task_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(updated_title, "Updated Task");
        
        // Delete task
        db.conn.execute("DELETE FROM tasks WHERE id = ?1", params![task_id]).unwrap();
        
        let count: i64 = db.conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE id = ?1",
            params![task_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(count, 0);
    }
    
    #[test]
    fn test_project_crud() {
        let (_temp_dir, db) = setup_test_db();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        // Create project
        let project_id = Uuid::new_v4().to_string();
        db.conn.execute(
            "INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![project_id.clone(), "Test Project", "#FF0000", now, now],
        ).unwrap();
        
        // Read project
        let name: String = db.conn.query_row(
            "SELECT name FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(name, "Test Project");
        
        // Update project
        db.conn.execute(
            "UPDATE projects SET name = ?1 WHERE id = ?2",
            params!["Updated Project", project_id],
        ).unwrap();
        
        let updated_name: String = db.conn.query_row(
            "SELECT name FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(updated_name, "Updated Project");
        
        // Delete project
        db.conn.execute("DELETE FROM projects WHERE id = ?1", params![project_id]).unwrap();
        
        let count: i64 = db.conn.query_row(
            "SELECT COUNT(*) FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(count, 0);
    }
    
    #[test]
    fn test_settings() {
        let (_temp_dir, db) = setup_test_db();
        
        // Insert setting
        db.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params!["test_key", "test_value"],
        ).unwrap();
        
        // Read setting
        let value: String = db.conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params!["test_key"],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(value, "test_value");
        
        // Update setting
        db.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params!["test_key", "updated_value"],
        ).unwrap();
        
        let updated_value: String = db.conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params!["test_key"],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(updated_value, "updated_value");
    }
}

