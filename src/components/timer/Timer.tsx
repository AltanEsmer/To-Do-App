import { useEffect, useRef } from 'react'
import { useTimer } from '../../store/useTimer'
import { Play, Pause, RotateCcw } from 'lucide-react'

/**
 * Timer component that displays the countdown and controls
 */
export function Timer() {
  const { mode, status, timeLeft, startTimer, pauseTimer, resetTimer, _tick, syncTimer } = useTimer()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Sync timer when component mounts (handles page navigation)
  useEffect(() => {
    syncTimer()
  }, [syncTimer])

  // Manage the timer interval
  useEffect(() => {
    if (status === 'running') {
      // Sync immediately when status changes to running
      syncTimer()
      
      intervalRef.current = setInterval(() => {
        _tick()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [status, _tick, syncTimer])

  const modeLabels = {
    pomodoro: 'Pomodoro',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  }

  const modeColors = {
    pomodoro: 'text-red-600 dark:text-red-400',
    shortBreak: 'text-green-600 dark:text-green-400',
    longBreak: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${modeColors[mode]}`}>
          {modeLabels[mode]}
        </h3>
      </div>

      <div className="relative">
        <div className="text-7xl font-mono font-bold text-foreground tabular-nums">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status === 'running' ? (
          <button
            onClick={pauseTimer}
            className="focus-ring flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            aria-label="Pause timer"
          >
            <Pause className="h-5 w-5" />
            Pause
          </button>
        ) : (
          <button
            onClick={startTimer}
            className="focus-ring flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            aria-label="Start timer"
          >
            <Play className="h-5 w-5" />
            Start
          </button>
        )}

        <button
          onClick={resetTimer}
          className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          aria-label="Reset timer"
        >
          <RotateCcw className="h-5 w-5" />
          Reset
        </button>
      </div>
    </div>
  )
}

