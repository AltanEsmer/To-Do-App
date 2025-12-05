import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useTimer } from '../store/useTimer'
import { useTasks } from '../store/useTasks'
import { CircularTimer } from '../components/timer/CircularTimer'
import { PomodoroStatsDisplay } from '../components/timer/PomodoroStats'
import { SoundControls } from '../components/timer/SoundControls'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Target, CheckCircle2, BarChart3, ListTodo, Plus } from 'lucide-react'
import { Card } from '../components/ui/card'

/**
 * Advanced Pomodoro timer page with immersive design
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
    if (
      previous.mode === 'pomodoro' &&
      previous.status === 'running' &&
      status === 'idle' &&
      mode !== 'pomodoro' &&
      activeTaskId
    ) {
      setCompletionDialogOpen(true)
    }
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

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* Background Gradient Mesh (Subtle) */}
      <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl transform -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl transform translate-y-1/2" />
      </div>

      <div className="z-10 flex h-full flex-col p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{t('pomodoro.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground font-medium">{t('pomodoro.subtitle')}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <SoundControls />
            
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                showStats 
                  ? 'bg-secondary text-secondary-foreground border-secondary' 
                  : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{showStats ? 'Hide Stats' : 'Stats'}</span>
            </button>
          </div>
        </div>

        {/* Stats Panel (Collapsible) */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="p-1">
                 <PomodoroStatsDisplay />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
          <div className="grid lg:grid-cols-12 gap-12 w-full items-center">
            
            {/* Left Column: Task Selection / Active Task */}
            <div className="lg:col-span-4 order-2 lg:order-1 flex flex-col gap-6">
               <Card className="p-6 shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
                 <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                    <ListTodo className="h-5 w-5" />
                    <h3 className="font-semibold">Focus Task</h3>
                 </div>
                 
                 {activeTask ? (
                   <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                             <Target className="h-4 w-4" />
                          </div>
                          <div>
                             <p className="font-medium text-foreground text-lg leading-snug">{activeTask.title}</p>
                             <p className="text-sm text-muted-foreground mt-1">Status: In Progress</p>
                          </div>
                        </div>
                     </div>
                     
                     {status !== 'running' && (
                        <button 
                           onClick={() => setActiveTask(null)}
                           className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center"
                        >
                           Change Focus
                        </button>
                     )}
                   </div>
                 ) : (
                   <div className="text-center py-8 space-y-4">
                     <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
                        <Target className="h-6 w-6 opacity-50" />
                     </div>
                     <div className="space-y-1">
                       <p className="font-medium">No task selected</p>
                       <p className="text-sm text-muted-foreground">Select a task to track your focus time</p>
                     </div>
                     <select
                        value=""
                        onChange={(e) => handleTaskSelect(e.target.value)}
                        className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={status === 'running'}
                      >
                        <option value="" disabled>Select a task...</option>
                        {incompleteTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                   </div>
                 )}
               </Card>

               {/* Daily Progress Mini-Card */}
               <div className="bg-card/30 rounded-xl p-4 border border-border/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Daily Sessions</span>
                  <div className="flex items-center gap-2">
                     <span className="text-2xl font-bold text-foreground">{cycles}</span>
                     <span className="text-xs text-muted-foreground uppercase tracking-wider">Completed</span>
                  </div>
               </div>
            </div>

            {/* Center Column: Timer */}
            <div className="lg:col-span-8 order-1 lg:order-2 flex justify-center">
               <div className="bg-card/30 rounded-3xl p-12 border border-border/30 shadow-2xl shadow-primary-500/5 backdrop-blur-sm">
                  <CircularTimer size={400} strokeWidth={16} />
               </div>
            </div>

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
              onClick={() => setCompletionDialogOpen(false)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t('pomodoro.notYet')}
            </button>
            <button
              onClick={handleCompleteTask}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
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