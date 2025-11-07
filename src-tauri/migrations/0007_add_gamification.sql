-- Migration 0007: Add gamification tables (user_progress, badges, xp_history)

-- User progress table: stores XP, level, and streak data
CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY DEFAULT 'default',
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_completion_date INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Badges table: stores earned badges with metadata
CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    badge_type TEXT NOT NULL,
    earned_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE
);

-- XP history table: tracks all XP transactions for analytics
CREATE TABLE IF NOT EXISTS xp_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    xp_amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    task_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_created_at ON xp_history(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_history_source ON xp_history(source);

-- Initialize default user progress if it doesn't exist
INSERT OR IGNORE INTO user_progress (id, total_xp, current_level, current_streak, longest_streak, created_at, updated_at)
VALUES ('default', 0, 1, 0, 0, (strftime('%s', 'now')), (strftime('%s', 'now')));

