-- Create task_templates table
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

-- Create index on template name for fast lookups
CREATE INDEX IF NOT EXISTS idx_templates_name ON task_templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_created ON task_templates(created_at);

