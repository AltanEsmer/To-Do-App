use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct PomodoroSession {
    pub id: String,
    pub user_id: String,
    pub task_id: Option<String>,
    pub started_at: i64,
    pub completed_at: i64,
    pub duration_seconds: i32,
    pub mode: String, // 'pomodoro', 'shortBreak', 'longBreak'
    pub was_completed: bool,
    pub task_completed: bool,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PomodoroStats {
    pub total_sessions: i64,
    pub total_duration_minutes: i64,
    pub completed_sessions: i64,
    pub average_duration_minutes: f64,
    pub sessions_by_mode: Vec<ModeStats>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModeStats {
    pub mode: String,
    pub count: i64,
    pub total_duration_minutes: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyPomodoroStats {
    pub date: String, // YYYY-MM-DD format
    pub session_count: i64,
    pub total_duration_minutes: i64,
    pub completed_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BestFocusTime {
    pub hour: i32, // 0-23
    pub session_count: i64,
    pub average_duration_minutes: f64,
    pub completion_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskCompletionRate {
    pub task_id: String,
    pub task_title: String,
    pub pomodoro_count: i64,
    pub completion_rate: f64, // percentage of Pomodoros that led to task completion
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PomodoroStreak {
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_session_date: Option<i64>,
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub fn create_pomodoro_session(
    conn: &rusqlite::Connection,
    task_id: Option<String>,
    started_at: i64,
    completed_at: i64,
    duration_seconds: i32,
    mode: String,
    was_completed: bool,
    task_completed: bool,
) -> Result<PomodoroSession, rusqlite::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = now();
    let user_id = "default".to_string();

    conn.execute(
        "INSERT INTO pomodoro_sessions (id, user_id, task_id, started_at, completed_at, duration_seconds, mode, was_completed, task_completed, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            user_id,
            task_id,
            started_at,
            completed_at,
            duration_seconds,
            mode,
            was_completed,
            task_completed,
            created_at
        ],
    )?;

    // Update streak
    update_streak(conn, completed_at)?;

    Ok(PomodoroSession {
        id,
        user_id,
        task_id,
        started_at,
        completed_at,
        duration_seconds,
        mode,
        was_completed,
        task_completed,
        created_at,
    })
}

fn update_streak(conn: &rusqlite::Connection, session_date: i64) -> Result<(), rusqlite::Error> {
    let user_id = "default";

    // Get current streak data
    let mut stmt = conn.prepare(
        "SELECT current_streak, longest_streak, last_session_date FROM pomodoro_streaks WHERE user_id = ?1"
    )?;

    let streak_data: Option<(i32, i32, Option<i64>)> = stmt
        .query_row(params![user_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .ok();

    let (new_current_streak, new_longest_streak) = if let Some((current_streak, longest_streak, last_session_date)) = streak_data {
        if let Some(last_date) = last_session_date {
            // Calculate days difference
            let last_day = last_date / 86400; // Convert to days
            let current_day = session_date / 86400;
            let days_diff = current_day - last_day;

            let new_current = if days_diff == 0 {
                // Same day, no change to streak
                current_streak
            } else if days_diff == 1 {
                // Consecutive day, increment streak
                current_streak + 1
            } else {
                // Streak broken, reset to 1
                1
            };

            let new_longest = new_current.max(longest_streak);
            (new_current, new_longest)
        } else {
            // First session
            (1, 1)
        }
    } else {
        // No streak record, create one
        (1, 1)
    };

    // Update or insert streak
    conn.execute(
        "INSERT OR REPLACE INTO pomodoro_streaks (id, user_id, current_streak, longest_streak, last_session_date, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, COALESCE((SELECT created_at FROM pomodoro_streaks WHERE user_id = ?2), ?6), ?7)",
        params![
            user_id,
            user_id,
            new_current_streak,
            new_longest_streak,
            session_date,
            now(),
            now()
        ],
    )?;

    Ok(())
}

pub fn get_pomodoro_stats(
    conn: &rusqlite::Connection,
    start_date: Option<i64>,
    end_date: Option<i64>,
) -> Result<PomodoroStats, rusqlite::Error> {
    let user_id = "default";

    // Build query with optional date filters
    let mut query = "SELECT COUNT(*), SUM(duration_seconds), SUM(CASE WHEN was_completed THEN 1 ELSE 0 END) FROM pomodoro_sessions WHERE user_id = ?1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(user_id.to_string())];

    if let Some(start) = start_date {
        query.push_str(" AND completed_at >= ?");
        params_vec.push(Box::new(start));
    }
    if let Some(end) = end_date {
        query.push_str(" AND completed_at <= ?");
        params_vec.push(Box::new(end));
    }

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let (total_sessions, total_duration_seconds, completed_sessions): (i64, i64, i64) = conn
        .query_row(&query, params_refs.as_slice(), |row| {
            Ok((
                row.get(0).unwrap_or(0),
                row.get(1).unwrap_or(0),
                row.get(2).unwrap_or(0),
            ))
        })?;

    let total_duration_minutes = total_duration_seconds / 60;
    let average_duration_minutes = if total_sessions > 0 {
        total_duration_minutes as f64 / total_sessions as f64
    } else {
        0.0
    };

    // Get sessions by mode
    let mut mode_query = "SELECT mode, COUNT(*), SUM(duration_seconds) FROM pomodoro_sessions WHERE user_id = ?1".to_string();
    let mut mode_params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(user_id.to_string())];

    if let Some(start) = start_date {
        mode_query.push_str(" AND completed_at >= ?");
        mode_params_vec.push(Box::new(start));
    }
    if let Some(end) = end_date {
        mode_query.push_str(" AND completed_at <= ?");
        mode_params_vec.push(Box::new(end));
    }
    mode_query.push_str(" GROUP BY mode");

    let mode_params_refs: Vec<&dyn rusqlite::ToSql> = mode_params_vec.iter().map(|b| b.as_ref()).collect();

    let mut stmt = conn.prepare(&mode_query)?;
    let sessions_by_mode = stmt
        .query_map(mode_params_refs.as_slice(), |row| {
            Ok(ModeStats {
                mode: row.get(0)?,
                count: row.get(1)?,
                total_duration_minutes: row.get::<_, i64>(2)? / 60,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(PomodoroStats {
        total_sessions,
        total_duration_minutes,
        completed_sessions,
        average_duration_minutes,
        sessions_by_mode,
    })
}

pub fn get_daily_stats(
    conn: &rusqlite::Connection,
    start_date: i64,
    end_date: i64,
) -> Result<Vec<DailyPomodoroStats>, rusqlite::Error> {
    let user_id = "default";

    let mut stmt = conn.prepare(
        "SELECT DATE(completed_at, 'unixepoch') as date, 
                COUNT(*) as session_count,
                SUM(duration_seconds) / 60 as total_duration_minutes,
                SUM(CASE WHEN was_completed THEN 1 ELSE 0 END) as completed_count
         FROM pomodoro_sessions
         WHERE user_id = ?1 AND completed_at >= ?2 AND completed_at <= ?3
         GROUP BY date
         ORDER BY date"
    )?;

    let stats = stmt
        .query_map(params![user_id, start_date, end_date], |row| {
            Ok(DailyPomodoroStats {
                date: row.get(0)?,
                session_count: row.get(1)?,
                total_duration_minutes: row.get(2)?,
                completed_count: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(stats)
}

pub fn get_best_focus_times(
    conn: &rusqlite::Connection,
) -> Result<Vec<BestFocusTime>, rusqlite::Error> {
    let user_id = "default";

    let mut stmt = conn.prepare(
        "SELECT CAST(strftime('%H', started_at, 'unixepoch') AS INTEGER) as hour,
                COUNT(*) as session_count,
                AVG(duration_seconds) / 60 as avg_duration_minutes,
                CAST(SUM(CASE WHEN was_completed THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as completion_rate
         FROM pomodoro_sessions
         WHERE user_id = ?1 AND mode = 'pomodoro'
         GROUP BY hour
         ORDER BY session_count DESC"
    )?;

    let focus_times = stmt
        .query_map(params![user_id], |row| {
            Ok(BestFocusTime {
                hour: row.get(0)?,
                session_count: row.get(1)?,
                average_duration_minutes: row.get(2)?,
                completion_rate: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(focus_times)
}

pub fn get_task_completion_rates(
    conn: &rusqlite::Connection,
) -> Result<Vec<TaskCompletionRate>, rusqlite::Error> {
    let user_id = "default";

    let mut stmt = conn.prepare(
        "SELECT ps.task_id, t.title, COUNT(*) as pomodoro_count,
                CAST(SUM(CASE WHEN ps.task_completed THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as completion_rate
         FROM pomodoro_sessions ps
         JOIN tasks t ON ps.task_id = t.id
         WHERE ps.user_id = ?1 AND ps.task_id IS NOT NULL AND ps.mode = 'pomodoro'
         GROUP BY ps.task_id, t.title
         HAVING COUNT(*) >= 1
         ORDER BY completion_rate DESC"
    )?;

    let rates = stmt
        .query_map(params![user_id], |row| {
            Ok(TaskCompletionRate {
                task_id: row.get(0)?,
                task_title: row.get(1)?,
                pomodoro_count: row.get(2)?,
                completion_rate: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rates)
}

pub fn get_pomodoro_streak(
    conn: &rusqlite::Connection,
) -> Result<PomodoroStreak, rusqlite::Error> {
    let user_id = "default";

    let mut stmt = conn.prepare(
        "SELECT current_streak, longest_streak, last_session_date 
         FROM pomodoro_streaks 
         WHERE user_id = ?1"
    )?;

    let streak = stmt.query_row(params![user_id], |row| {
        Ok(PomodoroStreak {
            current_streak: row.get(0)?,
            longest_streak: row.get(1)?,
            last_session_date: row.get(2)?,
        })
    })?;

    Ok(streak)
}
