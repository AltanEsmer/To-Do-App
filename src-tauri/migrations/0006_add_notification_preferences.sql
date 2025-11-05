-- Add notification preference columns to tasks table
ALTER TABLE tasks ADD COLUMN reminder_minutes_before INTEGER DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN notification_repeat INTEGER DEFAULT 0;

-- Create notification_schedule table for queued notifications
CREATE TABLE IF NOT EXISTS notification_schedule (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    snooze_until INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create index on scheduled_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_schedule_scheduled_at ON notification_schedule(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_schedule_task_id ON notification_schedule(task_id);

