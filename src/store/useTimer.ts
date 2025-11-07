import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tauriAdapter from '../api/tauriAdapter'
import { useXp } from './useXp'
import { toast } from '../components/ui/use-toast'

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

interface TimerSettings {
  pomodoroTime: number // in minutes
  shortBreakTime: number // in minutes
  longBreakTime: number // in minutes
  longBreakInterval: number // number of pomodoros before long break
}

interface TimerState {
  mode: TimerMode
  status: TimerStatus
  timeLeft: number // in seconds
  cycles: number // count of completed pomodoros in current set
  settings: TimerSettings
  activeTaskId: string | null
  startTime: number | null // timestamp in milliseconds when timer started
  initialTimeLeft: number // time left in seconds when timer started

  // Actions
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  setMode: (mode: TimerMode) => void
  setActiveTask: (taskId: string | null) => void
  _tick: () => void
  syncTimer: () => Promise<void> // recalculate timeLeft based on elapsed time
  loadSettings: () => Promise<void>
  updateSettings: (newSettings: Partial<TimerSettings>) => Promise<void>
}

const defaultSettings: TimerSettings = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
}

export const useTimer = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: 'pomodoro',
      status: 'idle',
      timeLeft: 25 * 60, // Default 25 minutes in seconds
      cycles: 0,
      settings: defaultSettings,
      activeTaskId: null,
      startTime: null,
      initialTimeLeft: 25 * 60,

      startTimer: () => {
        const state = get()
        const now = Date.now()
        
        if (state.status === 'idle' && state.timeLeft === 0) {
          // Reset timer if it's at 0
          const mode = state.mode
          const duration = mode === 'pomodoro'
            ? state.settings.pomodoroTime
            : mode === 'shortBreak'
            ? state.settings.shortBreakTime
            : state.settings.longBreakTime
          const newTimeLeft = duration * 60
          set({ 
            timeLeft: newTimeLeft, 
            status: 'running',
            startTime: now,
            initialTimeLeft: newTimeLeft
          })
        } else {
          // Resume from current timeLeft
          set({ 
            status: 'running',
            startTime: now,
            initialTimeLeft: state.timeLeft
          })
        }
      },

      pauseTimer: () => {
        const state = get()
        if (state.status === 'running' && state.startTime !== null) {
          // Calculate elapsed time and update timeLeft
          const now = Date.now()
          const elapsedSeconds = Math.floor((now - state.startTime) / 1000)
          const newTimeLeft = Math.max(0, state.initialTimeLeft - elapsedSeconds)
          set({ 
            status: 'paused',
            timeLeft: newTimeLeft,
            startTime: null,
            initialTimeLeft: newTimeLeft
          })
        } else {
          set({ status: 'paused' })
        }
      },

      resetTimer: () => {
        const state = get()
        const duration =
          state.mode === 'pomodoro'
            ? state.settings.pomodoroTime
            : state.mode === 'shortBreak'
            ? state.settings.shortBreakTime
            : state.settings.longBreakTime
        const newTimeLeft = duration * 60
        set({ 
          timeLeft: newTimeLeft, 
          status: 'idle',
          startTime: null,
          initialTimeLeft: newTimeLeft
        })
      },

      setMode: (mode: TimerMode) => {
        const state = get()
        const duration =
          mode === 'pomodoro'
            ? state.settings.pomodoroTime
            : mode === 'shortBreak'
            ? state.settings.shortBreakTime
            : state.settings.longBreakTime
        const newTimeLeft = duration * 60
        set({ 
          mode, 
          timeLeft: newTimeLeft, 
          status: 'idle',
          startTime: null,
          initialTimeLeft: newTimeLeft
        })
      },

      setActiveTask: (taskId: string | null) => {
        set({ activeTaskId: taskId })
      },

      syncTimer: async () => {
        const state = get()
        if (state.status === 'running' && state.startTime !== null) {
          const now = Date.now()
          const elapsedSeconds = Math.floor((now - state.startTime) / 1000)
          const newTimeLeft = Math.max(0, state.initialTimeLeft - elapsedSeconds)
          
          if (newTimeLeft <= 0) {
            // Timer finished
            set({ 
              status: 'idle',
              timeLeft: 0,
              startTime: null,
              initialTimeLeft: 0
            })

            if (state.mode === 'pomodoro') {
              // Pomodoro finished
              const newCycles = state.cycles + 1
              const shouldLongBreak = newCycles % state.settings.longBreakInterval === 0

              // Award focus XP via backend
              const xpStore = useXp.getState()
              xpStore.grantXp(5, 'pomodoro').catch(console.error)

              // Show notifications
              tauriAdapter.showNotification('Pomodoro Complete!', 'Time for a break!').catch(console.error)
              toast({
                title: 'Pomodoro Complete!',
                description: 'Time for a break!',
                variant: 'success',
                duration: 5000,
              })

              // Switch to break mode
              const nextMode: TimerMode = shouldLongBreak ? 'longBreak' : 'shortBreak'
              const breakDuration = shouldLongBreak
                ? state.settings.longBreakTime
                : state.settings.shortBreakTime

              set({
                mode: nextMode,
                timeLeft: breakDuration * 60,
                cycles: newCycles,
                initialTimeLeft: breakDuration * 60,
              })
            } else {
              // Break finished
              tauriAdapter.showNotification('Break Over!', "Break's over! Time to focus.").catch(console.error)
              toast({
                title: "Break's Over!",
                description: 'Time to focus.',
                variant: 'default',
                duration: 5000,
              })

              // Switch back to pomodoro mode
              const pomodoroDuration = state.settings.pomodoroTime * 60
              set({
                mode: 'pomodoro',
                timeLeft: pomodoroDuration,
                initialTimeLeft: pomodoroDuration,
              })
            }
          } else {
            set({ timeLeft: newTimeLeft })
          }
        }
      },

      _tick: () => {
        const state = get()
        if (state.status !== 'running') return

        // Use syncTimer to calculate based on elapsed time
        get().syncTimer()
      },

      loadSettings: async () => {
        try {
          const settings = await tauriAdapter.getSettings()
          const loadedSettings: TimerSettings = {
            pomodoroTime: settings.pomodoro_time
              ? parseInt(settings.pomodoro_time)
              : defaultSettings.pomodoroTime,
            shortBreakTime: settings.short_break_time
              ? parseInt(settings.short_break_time)
              : defaultSettings.shortBreakTime,
            longBreakTime: settings.long_break_time
              ? parseInt(settings.long_break_time)
              : defaultSettings.longBreakTime,
            longBreakInterval: settings.long_break_interval
              ? parseInt(settings.long_break_interval)
              : defaultSettings.longBreakInterval,
          }

          set({ settings: loadedSettings })

          // Update timeLeft if timer is idle
          const state = get()
          if (state.status === 'idle') {
            const duration =
              state.mode === 'pomodoro'
                ? loadedSettings.pomodoroTime
                : state.mode === 'shortBreak'
                ? loadedSettings.shortBreakTime
                : loadedSettings.longBreakTime
            set({ timeLeft: duration * 60 })
          }
        } catch (error) {
          console.error('Failed to load timer settings:', error)
        }
      },

      updateSettings: async (newSettings: Partial<TimerSettings>) => {
        const state = get()
        const updatedSettings = { ...state.settings, ...newSettings }

        try {
          // Save to database
          if (newSettings.pomodoroTime !== undefined) {
            await tauriAdapter.updateSettings(
              'pomodoro_time',
              newSettings.pomodoroTime.toString()
            )
          }
          if (newSettings.shortBreakTime !== undefined) {
            await tauriAdapter.updateSettings(
              'short_break_time',
              newSettings.shortBreakTime.toString()
            )
          }
          if (newSettings.longBreakTime !== undefined) {
            await tauriAdapter.updateSettings(
              'long_break_time',
              newSettings.longBreakTime.toString()
            )
          }
          if (newSettings.longBreakInterval !== undefined) {
            await tauriAdapter.updateSettings(
              'long_break_interval',
              newSettings.longBreakInterval.toString()
            )
          }

          set({ settings: updatedSettings })

          // Update timeLeft if timer is idle
          if (state.status === 'idle') {
            const duration =
              state.mode === 'pomodoro'
                ? updatedSettings.pomodoroTime
                : state.mode === 'shortBreak'
                ? updatedSettings.shortBreakTime
                : updatedSettings.longBreakTime
            set({ timeLeft: duration * 60 })
          }
        } catch (error) {
          console.error('Failed to update timer settings:', error)
          throw error
        }
      },
    }),
    {
      name: 'timer-storage',
      partialize: (state) => ({
        mode: state.mode,
        status: state.status,
        timeLeft: state.timeLeft,
        cycles: state.cycles,
        activeTaskId: state.activeTaskId,
        settings: state.settings,
        startTime: state.startTime,
        initialTimeLeft: state.initialTimeLeft,
      }),
    }
  )
)

