use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionStats {
    pub date: String, // YYYY-MM-DD format
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriorityDistribution {
    pub priority: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStats {
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub completion_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductivityTrend {
    pub date: String, // YYYY-MM-DD format
    pub completion_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MostProductiveDay {
    pub day_of_week: String,
    pub count: i64,
}

// Helper function to get current timestamp
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

/// Get tasks completed per day for the specified number of days
pub fn get_completion_stats(
    conn: &rusqlite::Connection,
    days: i32,
) -> Result<Vec<CompletionStats>, String> {
    let now = now();
    let start_timestamp = now - (days as i64 * 24 * 60 * 60);

    let mut stmt = conn
        .prepare(
            "SELECT 
                date(completed_at, 'unixepoch', 'localtime') as completion_date,
                COUNT(*) as count
            FROM tasks
            WHERE completed_at IS NOT NULL 
                AND completed_at >= ?1
            GROUP BY completion_date
            ORDER BY completion_date",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(params![start_timestamp], |row| {
            Ok(CompletionStats {
                date: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| format!("Query execution error: {}", e))?;

    let mut stats = Vec::new();
    for row in rows {
        stats.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }

    Ok(stats)
}

/// Get count of tasks grouped by priority level
pub fn get_priority_distribution(
    conn: &rusqlite::Connection,
) -> Result<Vec<PriorityDistribution>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT priority, COUNT(*) as count
            FROM tasks
            GROUP BY priority
            ORDER BY 
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PriorityDistribution {
                priority: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| format!("Query execution error: {}", e))?;

    let mut distribution = Vec::new();
    for row in rows {
        distribution.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }

    Ok(distribution)
}

/// Get task counts and completion rates per project
pub fn get_project_stats(conn: &rusqlite::Connection) -> Result<Vec<ProjectStats>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT 
                t.project_id,
                p.name as project_name,
                COUNT(*) as total_tasks,
                SUM(CASE WHEN t.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            GROUP BY t.project_id, p.name
            ORDER BY total_tasks DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let total: i64 = row.get(2)?;
            let completed: i64 = row.get(3)?;
            let completion_rate = if total > 0 {
                (completed as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            Ok(ProjectStats {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                total_tasks: total,
                completed_tasks: completed,
                completion_rate,
            })
        })
        .map_err(|e| format!("Query execution error: {}", e))?;

    let mut stats = Vec::new();
    for row in rows {
        stats.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }

    Ok(stats)
}

/// Get productivity trend (completion rate over time) for date range
pub fn get_productivity_trend(
    conn: &rusqlite::Connection,
    start_date: i64,
    end_date: i64,
) -> Result<Vec<ProductivityTrend>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT 
                date(completed_at, 'unixepoch', 'localtime') as completion_date,
                COUNT(*) as completed_count
            FROM tasks
            WHERE completed_at IS NOT NULL 
                AND completed_at >= ?1 
                AND completed_at <= ?2
            GROUP BY completion_date
            ORDER BY completion_date",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            let date: String = row.get(0)?;
            let completed_count: i64 = row.get(1)?;

            // Get total tasks created on or before this date
            let total_tasks: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM tasks WHERE created_at <= (SELECT MAX(completed_at) FROM tasks WHERE date(completed_at, 'unixepoch', 'localtime') = ?1)",
                    params![date.clone()],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            let completion_rate = if total_tasks > 0 {
                (completed_count as f64 / total_tasks as f64) * 100.0
            } else {
                0.0
            };

            Ok(ProductivityTrend {
                date,
                completion_rate,
            })
        })
        .map_err(|e| format!("Query execution error: {}", e))?;

    let mut trends = Vec::new();
    for row in rows {
        trends.push(row.map_err(|e| format!("Row parsing error: {}", e))?);
    }

    Ok(trends)
}

/// Get the day of week with most task completions
pub fn get_most_productive_day(
    conn: &rusqlite::Connection,
) -> Result<Option<MostProductiveDay>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT 
                CASE CAST(strftime('%w', datetime(completed_at, 'unixepoch', 'localtime')) AS INTEGER)
                    WHEN 0 THEN 'Sunday'
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                    ELSE 'Unknown'
                END as day_of_week,
                COUNT(*) as count
            FROM tasks
            WHERE completed_at IS NOT NULL
            GROUP BY day_of_week
            ORDER BY count DESC
            LIMIT 1",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let result = match stmt.query_row([], |row| {
        Ok(MostProductiveDay {
            day_of_week: row.get(0)?,
            count: row.get(1)?,
        })
    }) {
        Ok(day) => Some(day),
        Err(rusqlite::Error::QueryReturnedNoRows) => None,
        Err(e) => return Err(format!("Query execution error: {}", e)),
    };

    Ok(result)
}

/// Get average time from task creation to completion (in days)
pub fn get_average_completion_time(conn: &rusqlite::Connection) -> Result<f64, String> {
    let result = match conn.query_row(
        "SELECT AVG(CAST(completed_at - created_at AS REAL) / 86400.0) as avg_days
        FROM tasks
        WHERE completed_at IS NOT NULL",
        [],
        |row| row.get::<_, Option<f64>>(0),
    ) {
        Ok(Some(val)) => val,
        Ok(None) => 0.0,
        Err(rusqlite::Error::QueryReturnedNoRows) => 0.0,
        Err(e) => return Err(format!("Query error: {}", e)),
    };

    Ok(result)
}

