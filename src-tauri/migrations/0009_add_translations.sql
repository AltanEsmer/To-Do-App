-- Migration 0009: Add translations table for caching task content translations

CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY,
    source_text_hash TEXT NOT NULL,
    source_text TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    field_type TEXT NOT NULL, -- 'title' or 'description'
    task_id TEXT,
    is_user_edited INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_translations_cache ON translations(source_text_hash, source_lang, target_lang, field_type);
CREATE INDEX IF NOT EXISTS idx_translations_task_id ON translations(task_id);

