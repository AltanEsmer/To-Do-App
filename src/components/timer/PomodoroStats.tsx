import { useEffect, useState } from 'react'
import * as tauriAdapter from '../../api/tauriAdapter'
import { Card } from '../ui/card'

interface PomodoroStatsDisplayProps {
  startDate?: number
  endDate?: number
}

export function PomodoroStatsDisplay({ startDate, endDate }: PomodoroStatsDisplayProps) {
  const [stats, setStats] = useState<tauriAdapter.PomodoroStats | null>(null)
  const [streak, setStreak] = useState<tauriAdapter.PomodoroStreak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [startDate, endDate])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [statsData, streakData] = await Promise.all([
        tauriAdapter.getPomodoroStats(startDate, endDate),
        tauriAdapter.getPomodoroStreak(),
      ])
      setStats(statsData)
      setStreak(streakData)
    } catch (error) {
      console.error('Failed to load Pomodoro stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center p-4">Loading stats...</div>
  }

  if (!stats) {
    return <div className="text-center p-4">No stats available</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <div className="text-sm font-medium text-muted-foreground">Total Sessions</div>
        <div className="text-2xl font-bold">{stats.total_sessions}</div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium text-muted-foreground">Total Focus Time</div>
        <div className="text-2xl font-bold">{Math.floor(stats.total_duration_minutes / 60)}h {stats.total_duration_minutes % 60}m</div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium text-muted-foreground">Completed Sessions</div>
        <div className="text-2xl font-bold">{stats.completed_sessions}</div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium text-muted-foreground">Current Streak</div>
        <div className="text-2xl font-bold">{streak?.current_streak || 0} days</div>
        <div className="text-xs text-muted-foreground mt-1">
          Best: {streak?.longest_streak || 0} days
        </div>
      </Card>

      {stats.sessions_by_mode.length > 0 && (
        <Card className="p-4 md:col-span-2 lg:col-span-4">
          <div className="text-sm font-medium text-muted-foreground mb-3">Sessions by Mode</div>
          <div className="space-y-2">
            {stats.sessions_by_mode.map((mode) => (
              <div key={mode.mode} className="flex items-center justify-between">
                <span className="capitalize">{mode.mode}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{mode.count} sessions</span>
                  <span className="text-sm font-medium">{mode.total_duration_minutes} min</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
