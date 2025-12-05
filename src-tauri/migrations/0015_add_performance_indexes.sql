-- Migration 0015: Add performance indexes for query optimization

-- Index for filtering by priority
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Index for filtering by status (completed_at is null for incomplete tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(completed_at, due_at);

-- Composite index for common queries (project + completion status)
CREATE INDEX IF NOT EXISTS idx_tasks_project_completed ON tasks(project_id, completed_at);

-- Index for task tags lookup
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Index for task order within projects
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(project_id, order_index);

-- Index for recurrence queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence_parent_id);
