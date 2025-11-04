use tauri::api::notification::Notification;

pub fn show_notification(title: &str, body: &str) -> Result<(), Box<dyn std::error::Error>> {
    Notification::new("com.todoapp.dev")
        .title(title)
        .body(body)
        .show()?;
    Ok(())
}

pub fn check_and_schedule_notifications(
    _app_handle: &tauri::AppHandle,
    db: &crate::db::DbConnection,
) -> Result<(), Box<dyn std::error::Error>> {
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    // Get tasks that are due or overdue and not completed
    let mut stmt = db.conn.prepare(
        "SELECT id, title, due_at FROM tasks WHERE due_at IS NOT NULL AND due_at <= ?1 AND completed_at IS NULL"
    )?;
    
    let rows = stmt.query_map([now + 3600], |row| { // Check tasks due in next hour
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<i64>>(2)?))
    })?;
    
    for row in rows {
        if let Ok((_id, title, due_at)) = row {
            if let Some(due_at) = due_at {
                let time_until_due = due_at - now;
                if time_until_due <= 3600 && time_until_due > 0 {
                    // Task is due within the next hour
                    let _ = show_notification(
                        "Task Due Soon",
                        &format!("{} is due soon", title),
                    );
                } else if time_until_due <= 0 {
                    // Task is overdue
                    let _ = show_notification(
                        "Task Overdue",
                        &format!("{} is overdue", title),
                    );
                }
            }
        }
    }
    
    Ok(())
}

