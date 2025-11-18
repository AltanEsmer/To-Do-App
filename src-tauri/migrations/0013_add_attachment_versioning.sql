-- Add versioning support to attachments table
ALTER TABLE attachments ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE attachments ADD COLUMN parent_id TEXT;
ALTER TABLE attachments ADD COLUMN is_current INTEGER DEFAULT 1 NOT NULL;

-- Add indexes for efficient version queries
CREATE INDEX IF NOT EXISTS idx_attachments_parent_id ON attachments(parent_id);
CREATE INDEX IF NOT EXISTS idx_attachments_is_current ON attachments(is_current);
CREATE INDEX IF NOT EXISTS idx_attachments_task_current ON attachments(task_id, is_current);
