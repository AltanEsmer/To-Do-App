import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../utils/useTheme'
import { XPBar } from './ui/XPBar'

/**
 * Header component with app title, XP bar, theme toggle, and placeholder for user menu
 */
export function Header() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">{t('app.title')}</h1>
      <div className="flex flex-1 items-center gap-4 px-8">
        <div className="flex-1 max-w-md">
          <XPBar />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="focus-ring rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <div className="h-8 w-8 rounded-full bg-muted" aria-label="User menu placeholder" />
      </div>
    </header>
  )
}

