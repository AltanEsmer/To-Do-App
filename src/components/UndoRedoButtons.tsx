import { Undo2, Redo2 } from 'lucide-react'
import { Button } from './ui/button'
import { useUndoRedo } from '../hooks/useUndoRedo'

export function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  const handleUndo = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (canUndo) {
      await undo()
    }
  }

  const handleRedo = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (canRedo) {
      await redo()
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="Undo (Ctrl+Z)"
        title="Undo (Ctrl+Z)"
        type="button"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="Redo (Ctrl+Shift+Z)"
        title="Redo (Ctrl+Shift+Z)"
        type="button"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
