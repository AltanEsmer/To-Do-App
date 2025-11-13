import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimer } from '../store/useTimer'
import { useTasks } from '../store/useTasks'
import { Timer } from '../components/timer/Timer'
import { PomodoroStatsDisplay } from '../components/timer/PomodoroStats'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Target, CheckCircle2, BarChart3 } from 'lucide-react'

/**
 * Pomodoro timer page with task integration
 */
export function Pomodoro() {
  const { t } = useTranslation()
  const { activeTaskId, setActiveTask, mode, status, cycles, loadSettings } = useTimer()
  const { tasks, toggleComplete } = useTasks()
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const previousStateRef = useRef({ mode, status })

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Watch for pomodoro completion
  useEffect(() => {
    const previous = previousStateRef.current
    // Check if we just finished a pomodoro (was running pomodoro, now idle in break mode)
    if (
      previous.mode === 'pomodoro' &&
      previous.status === 'running' &&
      status === 'idle' &&
      mode !== 'pomodoro' &&
      activeTaskId
    ) {
      // Pomodoro just finished, show completion dialog
      setCompletionDialogOpen(true)
    }

    // Update previous state
    previousStateRef.current = { mode, status }
  }, [mode, status, activeTaskId])

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null
  const incompleteTasks = tasks.filter((t) => !t.completed)

  const handleTaskSelect = (taskId: string) => {
    setActiveTask(taskId)
  }

  const handleCompleteTask = async () => {
    if (activeTaskId) {
      try {
        await toggleComplete(activeTaskId)
        setCompletionDialogOpen(false)
      } catch (error) {
        console.error('Failed to complete task:', error)
      }
    }
  }

  const handleSkipCompletion = () => {
    setCompletionDialogOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('pomodoro.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('pomodoro.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <BarChart3 className="h-4 w-4" />
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {showStats && (
        <div className="mb-6">
          <PomodoroStatsDisplay />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center space-y-8">
        {/* Timer Display */}
        <div className="w-full max-w-2xl">
          <Timer />
        </div>

        {/* Task Selection */}
        <div className="w-full max-w-2xl space-y-4">
          <div>
            <label htmlFor="task-select" className="mb-2 block text-sm font-medium text-foreground">
              {t('pomodoro.selectTask')}
            </label>
            <select
              id="task-select"
              value={activeTaskId || ''}
              onChange={(e) => handleTaskSelect(e.target.value || null)}
              className="focus-ring w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
              disabled={status === 'running'}
            >
              <option value="">{t('pomodoro.noTaskSelected')}</option>
              {incompleteTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          {/* Active Task Display */}
          {activeTask && status === 'running' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t('pomodoro.focusingOn')}</p>
                  <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                    {activeTask.title}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cycle Counter */}
          <div className="text-center text-sm text-muted-foreground">
            {t('pomodoro.completedPomodoros')}: {cycles}
          </div>
        </div>
      </div>

      {/* Completion Dialog */}
      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pomodoro.complete')}</DialogTitle>
            <DialogDescription>
              {activeTask?.title 
                ? t('pomodoro.completeDesc', { taskTitle: activeTask.title })
                : t('pomodoro.completeDescNoTask')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={handleSkipCompletion}
              className="focus-ring rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t('pomodoro.notYet')}
            </button>
            <button
              onClick={handleCompleteTask}
              className="focus-ring flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('pomodoro.yesComplete')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

