-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at INTEGER NOT NULL,
    usage_count INTEGER DEFAULT 0
);

-- Task-Tag junction table
CREATE TABLE IF NOT EXISTS task_tags (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(task_id, tag_id)
);

-- Task relationships table
CREATE TABLE IF NOT EXISTS task_relationships (
    id TEXT PRIMARY KEY,
    task_id_1 TEXT NOT NULL,
    task_id_2 TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'related',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id_1) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id_2) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE(task_id_1, task_id_2),
    CHECK(task_id_1 != task_id_2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count);
CREATE INDEX IF NOT EXISTS idx_task_relationships_task_1 ON task_relationships(task_id_1);
CREATE INDEX IF NOT EXISTS idx_task_relationships_task_2 ON task_relationships(task_id_2);
