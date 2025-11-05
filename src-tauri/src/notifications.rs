use tauri::api::notification::Notification;
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub fn show_notification(title: &str, body: &str) -> Result<(), Box<dyn std::error::Error>> {
    Notification::new("com.todoapp.dev")
        .title(title)
        .body(body)
        .show()?;
    Ok(())
}

/// Schedule a notification for a task based on reminder preferences
pub fn schedule_notification(
    db: &crate::db::DbConnection,
    task_id: &str,
    reminder_minutes_before: Option<i32>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Get task details
    let task_info: Option<(Option<i64>, i32)> = db.conn.query_row(
        "SELECT due_at, notification_repeat FROM tasks WHERE id = ?1 AND completed_at IS NULL",
        params![task_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).ok();
    
    if let Some((due_at, notification_repeat)) = task_info {
        if let Some(due_at) = due_at {
            let reminder_minutes = reminder_minutes_before.unwrap_or(15); // Default 15 minutes
            let scheduled_at = due_at - (reminder_minutes as i64 * 60);
            let now = now();
            
            // Only schedule if notification is in the future
            if scheduled_at > now {
                let notification_id = uuid::Uuid::new_v4().to_string();
                
                db.conn.execute(
                    "INSERT INTO notification_schedule (id, task_id, scheduled_at, snooze_until, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![notification_id, task_id, scheduled_at, None::<i64>, now],
                )?;
                
                // If repeat is enabled, schedule daily reminders until task is completed
                if notification_repeat == 1 {
                    let mut next_scheduled = scheduled_at + (24 * 60 * 60); // Next day
                    let max_future = now + (30 * 24 * 60 * 60); // Max 30 days ahead
                    
                    while next_scheduled <= max_future {
                        let repeat_id = uuid::Uuid::new_v4().to_string();
                        let _ = db.conn.execute(
                            "INSERT INTO notification_schedule (id, task_id, scheduled_at, snooze_until, created_at)
                             VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![repeat_id, task_id, next_scheduled, None::<i64>, now],
                        );
                        next_scheduled += 24 * 60 * 60;
                    }
                }
            }
        }
    }
    
    Ok(())
}

/// Snooze a notification for specified duration (in minutes)
pub fn snooze_notification(
    db: &crate::db::DbConnection,
    notification_id: &str,
    snooze_duration_minutes: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = now();
    let snooze_until = now + (snooze_duration_minutes as i64 * 60);
    
    db.conn.execute(
        "UPDATE notification_schedule SET snooze_until = ?1 WHERE id = ?2",
        params![snooze_until, notification_id],
    )?;
    
    Ok(())
}

/// Check and send due notifications from the schedule table
pub fn check_due_notifications(
    db: &crate::db::DbConnection,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = now();
    
    // Get notifications that are due and not snoozed
    let mut stmt = db.conn.prepare(
        "SELECT ns.id, ns.task_id, t.title, t.completed_at
         FROM notification_schedule ns
         JOIN tasks t ON ns.task_id = t.id
         WHERE ns.scheduled_at <= ?1
           AND (ns.snooze_until IS NULL OR ns.snooze_until <= ?1)
           AND t.completed_at IS NULL"
    )?;
    
    let rows = stmt.query_map([now], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;
    
    let mut notifications_to_send = Vec::new();
    let mut notification_ids_to_delete = Vec::new();
    
    for row in rows {
        if let Ok((notification_id, task_id, title)) = row {
            notifications_to_send.push((task_id.clone(), title.clone()));
            notification_ids_to_delete.push(notification_id);
        }
    }
    
    // Send notifications
    for (_task_id, title) in &notifications_to_send {
        let _ = show_notification(
            "Task Reminder",
            &format!("{} is due soon", title),
        );
    }
    
    // Delete sent notifications (non-repeating ones)
    // For repeating notifications, we'll let them reschedule naturally
    for notification_id in &notification_ids_to_delete {
        let _ = db.conn.execute(
            "DELETE FROM notification_schedule WHERE id = ?1",
            params![notification_id],
        );
    }
    
    Ok(())
}

/// Check and schedule notifications for all tasks with reminder preferences
pub fn check_and_schedule_notifications(
    _app_handle: &tauri::AppHandle,
    db: &crate::db::DbConnection,
) -> Result<(), Box<dyn std::error::Error>> {
    // First, check for due notifications
    check_due_notifications(db)?;
    
    // Then, schedule new notifications for tasks that need them
    let mut stmt = db.conn.prepare(
        "SELECT id, due_at, reminder_minutes_before
         FROM tasks
         WHERE due_at IS NOT NULL
           AND completed_at IS NULL
           AND reminder_minutes_before IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM notification_schedule ns
               WHERE ns.task_id = tasks.id
           )"
    )?;
    
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<i64>>(1)?,
            row.get::<_, Option<i32>>(2)?,
        ))
    })?;
    
    for row in rows {
        if let Ok((task_id, due_at, reminder_minutes_before)) = row {
            if due_at.is_some() {
                let _ = schedule_notification(db, &task_id, reminder_minutes_before);
            }
        }
    }
    
    Ok(())
}

