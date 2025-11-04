import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../utils/useTheme'

/**
 * Header component with app title, theme toggle, and placeholder for user menu
 */
export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">Todo App</h1>
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

