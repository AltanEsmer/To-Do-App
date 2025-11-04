-- Add recurrence fields to tasks table
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- The migration runner will handle "duplicate column" errors gracefully
ALTER TABLE tasks ADD COLUMN recurrence_type TEXT DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN recurrence_parent_id TEXT;
