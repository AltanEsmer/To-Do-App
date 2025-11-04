import { Link, useLocation } from 'react-router-dom'
import { Home, ClipboardList, CheckCircle2, Settings } from 'lucide-react'
import clsx from 'clsx'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    path: '/projects',
    label: 'All Tasks',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    path: '/completed',
    label: 'Completed',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
]

/**
 * Sidebar navigation component
 */
export function Sidebar() {
  const location = useLocation()

  return (
    <aside
      className="hidden w-64 border-r border-border bg-card md:flex md:flex-col"
      aria-label="Main navigation"
    >
      <nav className="flex-1 space-y-1 px-4 py-6" aria-label="Sidebar navigation">
        {navItems.map((item) => {
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
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

