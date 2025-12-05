import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { useTasks } from './store/useTasks'
import { useTags } from './store/useTags'
import { useXp } from './store/useXp'
import { isTauri } from './utils/tauri'
import { Toaster } from './components/ui/toaster'
import { LevelUpDialog } from './components/ui/LevelUpDialog'

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })))
const Completed = lazy(() => import('./pages/Completed').then(m => ({ default: m.Completed })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Statistics = lazy(() => import('./pages/Statistics').then(m => ({ default: m.Statistics })))
const Pomodoro = lazy(() => import('./pages/Pomodoro').then(m => ({ default: m.Pomodoro })))
const Tags = lazy(() => import('./pages/Tags').then(m => ({ default: m.Tags })))
const Kanban = lazy(() => import('./pages/Kanban').then(m => ({ default: m.Kanban })))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
    </div>
  )
}

function App() {
  const { syncTasks } = useTasks()
  const { syncTags } = useTags()
  const { hasLeveledUp, newLevel, resetLevelUp, syncFromBackend, loadBadges, checkBadges } = useXp()
  const [levelUpDialogOpen, setLevelUpDialogOpen] = useState(false)

  // Watch for level-ups
  useEffect(() => {
    if (hasLeveledUp && newLevel !== null) {
      setLevelUpDialogOpen(true)
    }
  }, [hasLeveledUp, newLevel])

  const handleLevelUpDialogClose = () => {
    setLevelUpDialogOpen(false)
    resetLevelUp()
  }

  // Initialize gamification on mount
  useEffect(() => {
    const initializeGamification = async () => {
      try {
        // Always sync XP (has fallback for browser mode)
        await syncFromBackend()
        // Load badges
        await loadBadges()
        // Check for badges only in Tauri mode
        if (isTauri()) {
          await checkBadges()
        }
      } catch (error) {
        console.error('Failed to initialize gamification:', error)
      }
    }
    
    initializeGamification()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  useEffect(() => {
    // Sync tasks on mount (only in Tauri)
    if (isTauri()) {
      syncTasks().catch((error) => {
        console.error('Failed to sync tasks:', error)
      })
      syncTags().catch((error) => {
        console.error('Failed to sync tags:', error)
      })
    }

    // Listen for quick-add event from system tray (only in Tauri)
    if (isTauri()) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        const unlisten = listen('quick-add', () => {
          window.dispatchEvent(new CustomEvent('open-add-task'))
        })

        const unlistenTheme = listen('toggle-theme', () => {
          window.dispatchEvent(new CustomEvent('toggle-theme'))
        })

        return () => {
          unlisten.then((fn) => fn())
          unlistenTheme.then((fn) => fn())
        }
      }).catch((error) => {
        console.error('Failed to set up event listeners:', error)
      })
    }
  }, [syncTasks])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/completed" element={<Completed />} />
                <Route path="/kanban" element={<Kanban />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/pomodoro" element={<Pomodoro />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        <Toaster />
        <LevelUpDialog
          open={levelUpDialogOpen}
          onOpenChange={handleLevelUpDialogClose}
          newLevel={newLevel || 1}
        />
      </div>
    </BrowserRouter>
  )
}

export default App

