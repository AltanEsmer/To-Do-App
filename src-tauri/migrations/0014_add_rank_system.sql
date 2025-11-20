-- Migration 0014: Add rank achievement system (League of Legends-style)

-- Ranks table: stores user's current rank and rank history
CREATE TABLE IF NOT EXISTS ranks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    rank_tier TEXT NOT NULL, -- iron, bronze, silver, gold, platinum, diamond, master, grandmaster, challenger
    rank_division INTEGER, -- IV=4, III=3, II=2, I=1, or NULL for master/grandmaster/challenger
    achieved_at INTEGER NOT NULL,
    total_xp_at_achievement INTEGER NOT NULL,
    level_at_achievement INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_progress(id) ON DELETE CASCADE
);

-- Current rank tracking in user_progress
ALTER TABLE user_progress ADD COLUMN current_rank_tier TEXT DEFAULT 'iron';
ALTER TABLE user_progress ADD COLUMN current_rank_division INTEGER DEFAULT 4;
ALTER TABLE user_progress ADD COLUMN rank_progress INTEGER DEFAULT 0; -- Progress towards next rank (0-100)

-- Create indexes for rank queries
CREATE INDEX IF NOT EXISTS idx_ranks_user_id ON ranks(user_id);
CREATE INDEX IF NOT EXISTS idx_ranks_achieved_at ON ranks(achieved_at);
CREATE INDEX IF NOT EXISTS idx_ranks_tier_division ON ranks(rank_tier, rank_division);

-- Initialize default rank for existing users
UPDATE user_progress SET current_rank_tier = 'iron', current_rank_division = 4 WHERE current_rank_tier IS NULL;
