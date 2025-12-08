import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTimer } from '../../store/useTimer'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'

interface CircularTimerProps {
  size?: number
  strokeWidth?: number
}

export function CircularTimer({ size = 320, strokeWidth = 12 }: CircularTimerProps) {
  const { mode, status, timeLeft, settings, startTimer, pauseTimer, resetTimer, skipTimer, _tick, syncTimer } = useTimer()
  
  // Calculate total duration based on current mode settings
  const duration = (
    mode === 'pomodoro' ? settings.pomodoroTime :
    mode === 'shortBreak' ? settings.shortBreakTime :
    settings.longBreakTime
  ) * 60

  // Calculate progress
  const progress = duration > 0 ? (timeLeft / duration) : 0
  
  // SVG geometry
  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress * circumference)

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Colors based on mode
  const getColors = () => {
    switch (mode) {
      case 'pomodoro':
        return {
          stroke: 'stroke-red-500',
          gradientStart: '#ef4444', // red-500
          gradientEnd: '#f87171',   // red-400
          bg: 'bg-red-50 dark:bg-red-950/20',
          text: 'text-red-600 dark:text-red-400',
          ring: 'text-red-100 dark:text-red-900/20',
          shadow: 'shadow-red-500/20'
        }
      case 'shortBreak':
        return {
          stroke: 'stroke-green-500',
          gradientStart: '#22c55e', // green-500
          gradientEnd: '#4ade80',   // green-400
          bg: 'bg-green-50 dark:bg-green-950/20',
          text: 'text-green-600 dark:text-green-400',
          ring: 'text-green-100 dark:text-green-900/20',
          shadow: 'shadow-green-500/20'
        }
      case 'longBreak':
        return {
          stroke: 'stroke-blue-500',
          gradientStart: '#3b82f6', // blue-500
          gradientEnd: '#60a5fa',   // blue-400
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          text: 'text-blue-600 dark:text-blue-400',
          ring: 'text-blue-100 dark:text-blue-900/20',
          shadow: 'shadow-blue-500/20'
        }
    }
  }

  const colors = getColors()

  // Sync timer on mount and interval
  useEffect(() => {
    syncTimer()
    let interval: ReturnType<typeof setInterval>
    
    if (status === 'running') {
      interval = setInterval(() => {
        _tick()
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [status, _tick, syncTimer])

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* SVG Circle */}
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Defs for gradients */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.gradientStart} />
                <stop offset="100%" stopColor={colors.gradientEnd} />
              </linearGradient>
            </defs>
            
            {/* Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className={colors.ring}
            />
            
            {/* Progress Circle with Animation */}
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <div className={`text-xl font-medium mb-4 uppercase tracking-widest opacity-80 ${colors.text}`}>
              {mode === 'pomodoro' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </div>
            <div className="text-8xl font-bold tracking-tighter text-foreground font-mono tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className={`mt-4 h-6 text-sm font-medium ${status === 'running' ? 'animate-pulse text-primary' : 'text-muted-foreground'}`}>
              {status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : 'Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-12 flex items-center gap-8">
        <button
          onClick={resetTimer}
          className="group relative flex items-center justify-center p-4 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all hover:scale-110 active:scale-95"
          title="Reset"
        >
          <RotateCcw className="w-6 h-6" />
          <span className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium whitespace-nowrap">Reset</span>
        </button>

        {status === 'running' ? (
          <button
            onClick={pauseTimer}
            className={`p-8 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 ${colors.bg} ${colors.text} ${colors.shadow} ring-1 ring-inset ring-black/5 dark:ring-white/5`}
            title="Pause"
          >
            <Pause className="w-10 h-10 fill-current" />
          </button>
        ) : (
          <button
            onClick={startTimer}
            className={`p-8 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 ${colors.bg} ${colors.text} ${colors.shadow} ring-1 ring-inset ring-black/5 dark:ring-white/5`}
            title="Start"
          >
            <Play className="w-10 h-10 fill-current ml-1" />
          </button>
        )}

        <button
          onClick={skipTimer}
          className="group relative flex items-center justify-center p-4 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all hover:scale-110 active:scale-95"
          title="Skip"
        >
          <SkipForward className="w-6 h-6" />
          <span className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium whitespace-nowrap">Skip</span>
        </button>
      </div>
    </div>
  )
}