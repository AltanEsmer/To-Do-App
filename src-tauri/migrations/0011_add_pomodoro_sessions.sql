-- Migration 0011: Add Pomodoro session tracking and analytics

-- Pomodoro sessions table: tracks all completed Pomodoro sessions
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    task_id TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'pomodoro', -- 'pomodoro', 'shortBreak', 'longBreak'
    was_completed INTEGER NOT NULL DEFAULT 1, -- 0 if interrupted/cancelled, 1 if completed
    task_completed INTEGER NOT NULL DEFAULT 0, -- 1 if associated task was completed, 0 otherwise
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Pomodoro streaks table: tracks consecutive days with Pomodoro completions
CREATE TABLE IF NOT EXISTS pomodoro_streaks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_session_date INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed_at ON pomodoro_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_mode ON pomodoro_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_pomodoro_streaks_user_id ON pomodoro_streaks(user_id);

-- Initialize default Pomodoro streak record
INSERT OR IGNORE INTO pomodoro_streaks (id, user_id, current_streak, longest_streak, created_at, updated_at)
VALUES ('default', 'default', 0, 0, (strftime('%s', 'now')), (strftime('%s', 'now')));
