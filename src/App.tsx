import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { Completed } from './pages/Completed'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/completed" element={<Completed />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

