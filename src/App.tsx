import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { Completed } from './pages/Completed'
import { Settings } from './pages/Settings'
import { Statistics } from './pages/Statistics'
import { useTasks } from './store/useTasks'
import { isTauri } from './utils/tauri'

function App() {
  const { syncTasks } = useTasks()

  useEffect(() => {
    // Sync tasks on mount (only in Tauri)
    if (isTauri()) {
      syncTasks().catch((error) => {
        console.error('Failed to sync tasks:', error)
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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/completed" element={<Completed />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

