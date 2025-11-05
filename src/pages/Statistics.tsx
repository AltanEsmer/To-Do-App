import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, Download, TrendingUp, CheckCircle2, Calendar, Clock } from 'lucide-react'
import * as tauriAdapter from '../api/tauriAdapter'
import { useTasks } from '../store/useTasks'
import { isTauri } from '../utils/tauri'

type DateRange = '7' | '30' | '90' | 'all'

interface CompletionStats {
  date: string
  count: number
}

interface PriorityDistribution {
  priority: string
  count: number
}

interface ProjectStats {
  project_id: string | null
  project_name: string | null
  total_tasks: number
  completed_tasks: number
  completion_rate: number
}

interface ProductivityTrend {
  date: string
  completion_rate: number
}

interface MostProductiveDay {
  day_of_week: string
  count: number
}

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
}

const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#10b981']

export function Statistics() {
  const { tasks } = useTasks()
  const [dateRange, setDateRange] = useState<DateRange>('30')
  const [loading, setLoading] = useState(true)
  const [completionStats, setCompletionStats] = useState<CompletionStats[]>([])
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistribution[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([])
  const [productivityTrend, setProductivityTrend] = useState<ProductivityTrend[]>([])
  const [mostProductiveDay, setMostProductiveDay] = useState<MostProductiveDay | null>(null)
  const [averageCompletionTime, setAverageCompletionTime] = useState<number>(0)

  // Summary stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Helper function to safely convert date to Date object
  const toDate = (date: Date | string | undefined): Date | null => {
    if (!date) return null
    if (date instanceof Date) return date
    if (typeof date === 'string') return new Date(date)
    return null
  }

  // Helper function to get timestamp from date (handles both Date and string)
  const getTimestamp = (date: Date | string | undefined): number => {
    const dateObj = toDate(date)
    return dateObj ? dateObj.getTime() : 0
  }

  const now = Math.floor(Date.now() / 1000)
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  const weekStart = todayStart - 7 * 24 * 60 * 60
  const monthStart = todayStart - 30 * 24 * 60 * 60

  const tasksCompletedToday = tasks.filter(
    (t) => t.completed && t.updatedAt && Math.floor(getTimestamp(t.updatedAt) / 1000) >= todayStart
  ).length

  const tasksCompletedThisWeek = tasks.filter(
    (t) => t.completed && t.updatedAt && Math.floor(getTimestamp(t.updatedAt) / 1000) >= weekStart
  ).length

  const tasksCompletedThisMonth = tasks.filter(
    (t) => t.completed && t.updatedAt && Math.floor(getTimestamp(t.updatedAt) / 1000) >= monthStart
  ).length

  const averageTasksPerDay =
    totalTasks > 0 ? totalTasks / Math.max(1, Math.floor((now - getTimestamp(tasks[0]?.createdAt) / 1000) / 86400)) : 0

  useEffect(() => {
    loadStatistics()
  }, [dateRange])

  const loadStatistics = async () => {
    if (!isTauri()) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const days = dateRange === 'all' ? 365 * 2 : parseInt(dateRange)
      const startDate = dateRange === 'all' ? 0 : now - days * 24 * 60 * 60
      const endDate = now

      const [completion, priority, projects, trend, productiveDay, avgTime] = await Promise.all([
        tauriAdapter.getCompletionStats(days),
        tauriAdapter.getPriorityDistribution(),
        tauriAdapter.getProjectStats(),
        tauriAdapter.getProductivityTrend(startDate, endDate),
        tauriAdapter.getMostProductiveDay(),
        tauriAdapter.getAverageCompletionTime(),
      ])

      setCompletionStats(completion)
      setPriorityDistribution(priority)
      setProjectStats(projects)
      setProductivityTrend(trend)
      setMostProductiveDay(productiveDay)
      setAverageCompletionTime(avgTime)
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!isTauri()) {
      alert('Export is only available in Tauri desktop app.')
      return
    }

    try {
      // Export as JSON
      const statsData = {
        dateRange,
        summary: {
          totalTasks,
          completedTasks,
          completionRate,
          tasksCompletedToday,
          tasksCompletedThisWeek,
          tasksCompletedThisMonth,
          averageTasksPerDay,
          mostProductiveDay,
          averageCompletionTime,
        },
        completionStats,
        priorityDistribution,
        projectStats,
        productivityTrend,
        exportedAt: new Date().toISOString(),
      }

      const { save } = await import('@tauri-apps/api/dialog')
      const { writeTextFile } = await import('@tauri-apps/api/fs')

      const savedPath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: `todo_statistics_${dateRange}_days.json`,
      })

      if (savedPath) {
        await writeTextFile(savedPath, JSON.stringify(statsData, null, 2))
        alert('Statistics exported successfully!')
      }
    } catch (error) {
      console.error('Failed to export statistics:', error)
      alert('Failed to export statistics')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Statistics</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your productivity insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="focus-ring rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={handleExport}
            className="focus-ring flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pb-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-5 w-5" />
              <p className="text-sm font-medium">Total Tasks</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalTasks}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-5 w-5" />
              <p className="text-sm font-medium">Completion Rate</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{completionRate.toFixed(1)}%</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Today</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{tasksCompletedToday}</p>
            <p className="mt-1 text-xs text-muted-foreground">This week: {tasksCompletedThisWeek}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <p className="text-sm font-medium">This Month</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{tasksCompletedThisMonth}</p>
            <p className="mt-1 text-xs text-muted-foreground">Avg/day: {averageTasksPerDay.toFixed(1)}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <p className="text-sm font-medium">Most Productive</p>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {mostProductiveDay?.day_of_week || 'N/A'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mostProductiveDay ? `${mostProductiveDay.count} tasks` : 'No data'}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tasks Completed Over Time - Line Chart */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Tasks Completed Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={completionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution - Pie Chart */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ priority, percent }) => `${priority}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tasks by Project - Bar Chart */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Tasks by Project</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_tasks" fill="#3b82f6" name="Total Tasks" />
                <Bar dataKey="completed_tasks" fill="#10b981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Productivity Trend - Area Chart */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Productivity Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="completion_rate"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Completion Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Additional Statistics</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Average Completion Time</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {averageCompletionTime.toFixed(1)} days
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Average time from task creation to completion
              </p>
            </div>
            {mostProductiveDay && (
              <div>
                <p className="text-sm text-muted-foreground">Most Productive Day</p>
                <p className="mt-1 text-xl font-bold text-foreground">{mostProductiveDay.day_of_week}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mostProductiveDay.count} tasks completed on this day
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

