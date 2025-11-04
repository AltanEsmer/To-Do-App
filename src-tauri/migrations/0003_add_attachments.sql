-- Migration 0003: Add attachments table

CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);

