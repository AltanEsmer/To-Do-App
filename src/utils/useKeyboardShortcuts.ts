import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTauri } from './tauri'

interface KeyboardShortcutsOptions {
  onQuickAdd?: () => void
  onEscape?: () => void
  onEnter?: () => void
  onSearchFocus?: () => void
  onFilterFocus?: () => void
  onSortFocus?: () => void
  onTaskNavigate?: (direction: 'up' | 'down') => void
  onTaskToggle?: () => void
  onTaskDelete?: () => void
  onTaskEdit?: () => void
  onShowShortcuts?: () => void
  disabled?: boolean
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const {
    onQuickAdd,
    onEscape,
    onEnter,
    onSearchFocus,
    onFilterFocus,
    onSortFocus,
    onTaskNavigate,
    onTaskToggle,
    onTaskDelete,
    onTaskEdit,
    onShowShortcuts,
    disabled = false,
  } = options

  const navigate = useNavigate()
  const isInputFocusedRef = useRef(false)

  // Track if user is typing in an input field
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        isInputFocusedRef.current = true
      }
    }

    const handleFocusOut = () => {
      isInputFocusedRef.current = false
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return

      // Don't trigger shortcuts when typing in inputs
      if (isInputFocusedRef.current) {
        // Allow some shortcuts even in inputs
        if (e.key === 'Escape' && onEscape) {
          e.preventDefault()
          onEscape()
          return
        }
        if (e.key === 'Enter' && onEnter && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          onEnter()
          return
        }
        return
      }

      // Global shortcuts
      if (e.key === '?' && onShowShortcuts) {
        e.preventDefault()
        onShowShortcuts()
        return
      }

      // Navigation shortcuts
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.shiftKey && onQuickAdd) {
        e.preventDefault()
        onQuickAdd()
        return
      }

      // Search focus
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || e.key === '/') {
        e.preventDefault()
        if (onSearchFocus) {
          onSearchFocus()
        }
        return
      }

      // Filter focus
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (onFilterFocus) {
          onFilterFocus()
        }
        return
      }

      // Sort focus
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (onSortFocus) {
          onSortFocus()
        }
        return
      }

      // Task navigation
      if (e.key === 'ArrowUp' && onTaskNavigate) {
        e.preventDefault()
        onTaskNavigate('up')
        return
      }

      if (e.key === 'ArrowDown' && onTaskNavigate) {
        e.preventDefault()
        onTaskNavigate('down')
        return
      }

      // Task actions
      if (e.key === ' ' && onTaskToggle) {
        e.preventDefault()
        onTaskToggle()
        return
      }

      if (e.key === 'Delete' && onTaskDelete) {
        e.preventDefault()
        onTaskDelete()
        return
      }

      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && onTaskEdit) {
        e.preventDefault()
        onTaskEdit()
        return
      }

      // Enter key for submitting forms (when not in input)
      if (e.key === 'Enter' && onEnter && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onEnter()
        return
      }

      // Escape key for closing modals
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }
    },
    [
      disabled,
      onQuickAdd,
      onEscape,
      onEnter,
      onSearchFocus,
      onFilterFocus,
      onSortFocus,
      onTaskNavigate,
      onTaskToggle,
      onTaskDelete,
      onTaskEdit,
      onShowShortcuts,
    ]
  )

  // Listen for global shortcuts from Tauri
  useEffect(() => {
    if (!isTauri()) return

    const setupGlobalShortcuts = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event')

        // Listen for global shortcut events
        const unlistenAddTask = await listen('global-shortcut-add-task', () => {
          if (onQuickAdd) {
            onQuickAdd()
          }
        })

        const unlistenToggleTheme = await listen('global-shortcut-toggle-theme', () => {
          window.dispatchEvent(new CustomEvent('toggle-theme'))
        })

        const unlistenDashboard = await listen('global-shortcut-dashboard', () => {
          navigate('/')
        })

        return () => {
          unlistenAddTask()
          unlistenToggleTheme()
          unlistenDashboard()
        }
      } catch (error) {
        console.error('Failed to set up global shortcut listeners:', error)
      }
    }

    const cleanup = setupGlobalShortcuts()

    return () => {
      cleanup.then((fn) => fn?.())
    }
  }, [navigate, onQuickAdd])

  // Set up keyboard event listener
  useEffect(() => {
    if (disabled) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, disabled])
}

