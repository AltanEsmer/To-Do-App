import { useEffect, useState, useCallback } from 'react'
import { commandHistory } from '../utils/commandPattern'

export function useUndoRedo() {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const checkState = useCallback(() => {
    setCanUndo(commandHistory.canUndo())
    setCanRedo(commandHistory.canRedo())
  }, [])

  const undo = useCallback(async () => {
    if (!commandHistory.canUndo()) return
    await commandHistory.undo()
    checkState()
  }, [checkState])

  const redo = useCallback(async () => {
    if (!commandHistory.canRedo()) return
    await commandHistory.redo()
    checkState()
  }, [checkState])

  useEffect(() => {
    checkState()

    const unsubscribe = commandHistory.subscribe(() => {
      checkState()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        if (commandHistory.canRedo()) {
          redo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (commandHistory.canUndo()) {
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      unsubscribe()
    }
  }, [undo, redo, checkState])

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
