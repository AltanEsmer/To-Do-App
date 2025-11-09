import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ClipboardList, CheckCircle2, Settings, BarChart3, Timer, Hash } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import * as tauriAdapter from '../api/tauriAdapter'

interface NavItem {
  path: string
  labelKey: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    path: '/',
    labelKey: 'nav.dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    path: '/projects',
    labelKey: 'nav.allTasks',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    path: '/completed',
    labelKey: 'nav.completed',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    path: '/tags',
    labelKey: 'nav.tags',
    icon: <Hash className="h-5 w-5" />,
  },
  {
    path: '/statistics',
    labelKey: 'nav.statistics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    path: '/pomodoro',
    labelKey: 'nav.pomodoro',
    icon: <Timer className="h-5 w-5" />,
  },
  {
    path: '/settings',
    labelKey: 'nav.settings',
    icon: <Settings className="h-5 w-5" />,
  },
]

/**
 * Sidebar navigation component
 */
export function Sidebar() {
  const location = useLocation()
  const { t } = useTranslation()
  const [statisticsVisible, setStatisticsVisible] = useState(true)

  useEffect(() => {
    const loadStatisticsVisibility = async () => {
      try {
        const settings = await tauriAdapter.getSettings()
        // Default to true if setting doesn't exist (backward compatibility)
        setStatisticsVisible(settings.statistics_visible !== 'false')
      } catch (error) {
        console.error('Failed to load statistics visibility setting:', error)
        // Default to true on error
        setStatisticsVisible(true)
      }
    }
    loadStatisticsVisibility()

    // Listen for settings changes to update immediately
    const handleSettingsChange = () => {
      loadStatisticsVisibility()
    }
    window.addEventListener('settings-changed', handleSettingsChange)
    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange)
    }
  }, [])

  // Filter nav items based on statistics visibility setting
  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/statistics') {
      return statisticsVisible
    }
    return true
  })

  return (
    <aside
      className="hidden w-64 border-r border-border bg-card md:flex md:flex-col"
      aria-label="Main navigation"
    >
      <nav className="flex-1 space-y-1 px-4 py-6" aria-label="Sidebar navigation">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'focus-ring flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

