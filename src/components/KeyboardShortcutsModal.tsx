import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutGroup {
  title: string
  shortcuts: Array<{ keys: string[]; description: string }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Global Shortcuts',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Open app and show Add Task modal' },
      { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle theme (light/dark)' },
      { keys: ['Ctrl', 'Shift', 'O'], description: 'Open/focus app window' },
      { keys: ['Ctrl', 'Shift', 'D'], description: 'Open dashboard' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['N'], description: 'Quick add task (when not in input field)' },
      { keys: ['Ctrl', 'K'], description: 'Focus search bar' },
      { keys: ['/'], description: 'Focus search bar' },
      { keys: ['Ctrl', 'F'], description: 'Focus filter' },
      { keys: ['Ctrl', 'S'], description: 'Focus sort dropdown' },
      { keys: ['?'], description: 'Show keyboard shortcuts help' },
    ],
  },
  {
    title: 'Task Actions',
    shortcuts: [
      { keys: ['↑'], description: 'Navigate to previous task' },
      { keys: ['↓'], description: 'Navigate to next task' },
      { keys: ['Space'], description: 'Toggle task completion (when task focused)' },
      { keys: ['Delete'], description: 'Delete focused task' },
      { keys: ['E'], description: 'Edit focused task' },
    ],
  },
  {
    title: 'Form Actions',
    shortcuts: [
      { keys: ['Enter'], description: 'Submit forms (modals)' },
      { keys: ['Esc'], description: 'Close modals' },
    ],
  },
]

function KeyBadge({ keyName }: { keyName: string }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm">
      {keyName}
    </kbd>
  )
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
          <Dialog.Portal>
            <Dialog.Overlay
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              asChild
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none"
              asChild
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Keyboard className="h-6 w-6 text-primary-500" />
                    <Dialog.Title className="text-2xl font-bold text-foreground">
                      Keyboard Shortcuts
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="focus-ring rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
                  {shortcutGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">{group.title}</h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                          >
                            <span className="text-sm text-muted-foreground">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <span key={keyIndex} className="flex items-center gap-1">
                                  <KeyBadge keyName={key} />
                                  {keyIndex < shortcut.keys.length - 1 && (
                                    <span className="text-xs text-muted-foreground">+</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Dialog.Close asChild>
                    <button className="focus-ring rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  )
}

