# Error Handling, User Feedback & Undo/Redo Functionality

This document provides a comprehensive analysis and implementation plan for improving error handling, user feedback, and adding undo/redo functionality.

## 📊 Current State Analysis

### Error Handling Issues

**Current Problems**:
- 94+ `console.log/error/warn` statements found across codebase
- Many errors caught but not displayed to users
- Silent failures in critical operations
- No centralized error handling
- Inconsistent error messages
- No error recovery mechanisms
- No error logging/tracking for production

**Impact**: 
- 🔴 **Critical**: Poor user experience when things go wrong
- Users don't know what went wrong or how to fix it
- Errors go unnoticed, making debugging difficult

---

## 🔴 Critical: Error Handling Implementation

### 1. Centralized Error Handling System

#### Architecture Overview

```
User Action → API Call → Error Occurs → Error Handler → User Feedback + Logging
```

#### Implementation Plan

**A. Create Error Types**

```typescript
// src/utils/errors.ts

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // Task errors
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_UPDATE_FAILED = 'TASK_UPDATE_FAILED',
  TASK_DELETE_FAILED = 'TASK_DELETE_FAILED',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode
  message: string
  userMessage: string // User-friendly message
  details?: unknown
  timestamp: number
  context?: Record<string, unknown>
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public userMessage: string,
    public details?: unknown,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.timestamp = Date.now()
  }
}
```

**B. Create Error Handler Service**

```typescript
// src/services/errorHandler.ts

import { toast } from '../components/ui/use-toast'
import { ErrorCode, AppError } from '../utils/errors'

class ErrorHandler {
  private errorLog: AppError[] = []
  private maxLogSize = 100

  /**
   * Handle error and show user feedback
   */
  handleError(error: unknown, context?: Record<string, unknown>): void {
    const appError = this.normalizeError(error, context)
    
    // Log error
    this.logError(appError)
    
    // Show user-friendly message
    this.showUserFeedback(appError)
    
    // Send to error tracking (if configured)
    this.trackError(appError)
  }

  /**
   * Normalize different error types to AppError
   */
  private normalizeError(
    error: unknown, 
    context?: Record<string, unknown>
  ): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      return error
    }

    // Tauri error
    if (error && typeof error === 'object' && 'message' in error) {
      const tauriError = error as { message: string; code?: string }
      
      // Map Tauri errors to error codes
      if (tauriError.message.includes('command')) {
        return new AppError(
          ErrorCode.NETWORK_ERROR,
          tauriError.message,
          'Failed to communicate with the application. Please try again.',
          tauriError,
          context
        )
      }
      
      if (tauriError.message.includes('database')) {
        return new AppError(
          ErrorCode.DATABASE_ERROR,
          tauriError.message,
          'Database error occurred. Your data may not have been saved.',
          tauriError,
          context
        )
      }
    }

    // Standard Error
    if (error instanceof Error) {
      return new AppError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        'An unexpected error occurred. Please try again.',
        error,
        context
      )
    }

    // Unknown error type
    return new AppError(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      'An unexpected error occurred. Please try again.',
      error,
      context
    )
  }

  /**
   * Show user-friendly error message
   */
  private showUserFeedback(error: AppError): void {
    toast({
      title: 'Error',
      description: error.userMessage,
      variant: 'destructive',
      duration: 5000,
      action: error.code === ErrorCode.NETWORK_ERROR ? {
        label: 'Retry',
        onClick: () => {
          // Implement retry logic
        }
      } : undefined,
    })
  }

  /**
   * Log error for debugging
   */
  private logError(error: AppError): void {
    // Add to in-memory log
    this.errorLog.push(error)
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift()
    }

    // Console log in development
    if (import.meta.env.DEV) {
      console.error('Error:', {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details,
        context: error.context,
        timestamp: new Date(error.timestamp).toISOString(),
        stack: error.stack,
      })
    }
  }

  /**
   * Track error in production (Sentry, etc.)
   */
  private trackError(error: AppError): void {
    if (import.meta.env.PROD) {
      // Send to error tracking service
      // Example: Sentry.captureException(error)
    }
  }

  /**
   * Get recent errors (for debugging)
   */
  getRecentErrors(limit = 10): AppError[] {
    return this.errorLog.slice(-limit)
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = []
  }
}

export const errorHandler = new ErrorHandler()
```

**C. Create Error Boundary Component**

```typescript
// src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Could send to error tracking service here
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h2 className="text-lg font-semibold">Something went wrong</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
```

**D. Update Store Actions to Use Error Handler**

```typescript
// src/store/useTasks.ts

import { errorHandler } from '../services/errorHandler'
import { ErrorCode } from '../utils/errors'

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      // ... existing state

      addTask: async (taskData) => {
        try {
          const rustTask = await tauriAdapter.createTask({
            // ... task data
          })
          const newTask = convertTask(rustTask)
          set((state) => ({
            tasks: [...state.tasks, newTask],
          }))
        } catch (error) {
          errorHandler.handleError(
            error,
            { action: 'addTask', taskData }
          )
          throw error // Re-throw for component to handle if needed
        }
      },

      updateTask: async (id, updates) => {
        const previousTasks = get().tasks
        
        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          ),
        }))

        try {
          const rustTask = await tauriAdapter.updateTask(id, {
            // ... updates
          })
          const updatedTask = convertTask(rustTask)
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? updatedTask : task
            ),
          }))
        } catch (error) {
          // Rollback optimistic update
          set({ tasks: previousTasks })
          
          errorHandler.handleError(
            error,
            { action: 'updateTask', taskId: id, updates }
          )
          throw error
        }
      },

      // ... other actions
    }),
    // ... persist config
  )
)
```

**E. Wrap App with Error Boundary**

```typescript
// src/App.tsx

import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* ... rest of app */}
      </BrowserRouter>
    </ErrorBoundary>
  )
}
```

---

### 2. Replace Console Statements

**Current**: 94+ console statements
**Target**: 0 console statements in production

**Implementation**:

```typescript
// src/utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = import.meta.env.DEV

  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args)
    // Could send to error tracking in production
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, error, ...args)
    // Always log errors, even in production
    // Could send to error tracking service
  }
}

export const logger = new Logger()
```

**Migration**: Replace all `console.*` with `logger.*`

---

## 🟡 High Priority: Undo/Redo Functionality

### Architecture Overview

```
User Action → Command Pattern → Command History → Undo/Redo Stack
```

### Implementation Plan

#### 1. Command Pattern Implementation

```typescript
// src/utils/commandPattern.ts

/**
 * Base command interface
 */
export interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
  getDescription(): string
}

/**
 * Command history manager
 */
export class CommandHistory {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxHistorySize = 50

  /**
   * Execute a command and add to history
   */
  async execute(command: Command): Promise<void> {
    try {
      await command.execute()
      this.undoStack.push(command)
      
      // Clear redo stack when new command is executed
      this.redoStack = []
      
      // Limit history size
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift()
      }
    } catch (error) {
      errorHandler.handleError(error, { action: 'executeCommand' })
      throw error
    }
  }

  /**
   * Undo last command
   */
  async undo(): Promise<boolean> {
    const command = this.undoStack.pop()
    if (!command) {
      return false
    }

    try {
      await command.undo()
      this.redoStack.push(command)
      return true
    } catch (error) {
      // If undo fails, put command back
      this.undoStack.push(command)
      errorHandler.handleError(error, { action: 'undoCommand' })
      return false
    }
  }

  /**
   * Redo last undone command
   */
  async redo(): Promise<boolean> {
    const command = this.redoStack.pop()
    if (!command) {
      return false
    }

    try {
      await command.execute()
      this.undoStack.push(command)
      return true
    } catch (error) {
      // If redo fails, put command back
      this.redoStack.push(command)
      errorHandler.handleError(error, { action: 'redoCommand' })
      return false
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Get undo description
   */
  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1]
    return command ? command.getDescription() : null
  }

  /**
   * Get redo description
   */
  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1]
    return command ? command.getDescription() : null
  }

  /**
   * Clear history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}

export const commandHistory = new CommandHistory()
```

#### 2. Task Commands

```typescript
// src/commands/taskCommands.ts

import { Command } from '../utils/commandPattern'
import { useTasks } from '../store/useTasks'
import { Task } from '../store/useTasks'

/**
 * Command for creating a task
 */
export class CreateTaskCommand implements Command {
  private taskId: string | null = null

  constructor(
    private taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
    private tasksStore: ReturnType<typeof useTasks.getState>
  ) {}

  async execute(): Promise<void> {
    const task = await this.tasksStore.addTask(this.taskData)
    this.taskId = task.id
  }

  async undo(): Promise<void> {
    if (this.taskId) {
      await this.tasksStore.deleteTask(this.taskId)
    }
  }

  getDescription(): string {
    return `Create task "${this.taskData.title}"`
  }
}

/**
 * Command for updating a task
 */
export class UpdateTaskCommand implements Command {
  private previousTask: Task | null = null

  constructor(
    private taskId: string,
    private updates: Partial<Task>,
    private tasksStore: ReturnType<typeof useTasks.getState>
  ) {}

  async execute(): Promise<void> {
    // Store previous state before update
    this.previousTask = this.tasksStore.getTaskById(this.taskId) || null
    await this.tasksStore.updateTask(this.taskId, this.updates)
  }

  async undo(): Promise<void> {
    if (this.previousTask) {
      await this.tasksStore.updateTask(this.taskId, {
        title: this.previousTask.title,
        description: this.previousTask.description,
        completed: this.previousTask.completed,
        dueDate: this.previousTask.dueDate,
        priority: this.previousTask.priority,
        // ... other fields
      })
    }
  }

  getDescription(): string {
    const task = this.tasksStore.getTaskById(this.taskId)
    return `Update task "${task?.title || this.taskId}"`
  }
}

/**
 * Command for deleting a task
 */
export class DeleteTaskCommand implements Command {
  private deletedTask: Task | null = null

  constructor(
    private taskId: string,
    private tasksStore: ReturnType<typeof useTasks.getState>
  ) {}

  async execute(): Promise<void> {
    // Store task before deletion
    this.deletedTask = this.tasksStore.getTaskById(this.taskId) || null
    await this.tasksStore.deleteTask(this.taskId)
  }

  async undo(): Promise<void> {
    if (this.deletedTask) {
      await this.tasksStore.addTask({
        title: this.deletedTask.title,
        description: this.deletedTask.description,
        completed: this.deletedTask.completed,
        dueDate: this.deletedTask.dueDate,
        priority: this.deletedTask.priority,
        // ... other fields
      })
    }
  }

  getDescription(): string {
    return `Delete task "${this.deletedTask?.title || this.taskId}"`
  }
}

/**
 * Command for toggling task completion
 */
export class ToggleTaskCommand implements Command {
  constructor(
    private taskId: string,
    private tasksStore: ReturnType<typeof useTasks.getState>
  ) {}

  async execute(): Promise<void> {
    await this.tasksStore.toggleComplete(this.taskId)
  }

  async undo(): Promise<void> {
    // Toggle again to undo
    await this.tasksStore.toggleComplete(this.taskId)
  }

  getDescription(): string {
    const task = this.tasksStore.getTaskById(this.taskId)
    const action = task?.completed ? 'Uncomplete' : 'Complete'
    return `${action} task "${task?.title || this.taskId}"`
  }
}
```

#### 3. Undo/Redo Hook

```typescript
// src/hooks/useUndoRedo.ts

import { useCallback, useEffect } from 'react'
import { commandHistory } from '../utils/commandPattern'
import { useToast } from '../components/ui/use-toast'

export function useUndoRedo() {
  const { toast } = useToast()

  const undo = useCallback(async () => {
    const description = commandHistory.getUndoDescription()
    const success = await commandHistory.undo()
    
    if (success && description) {
      toast({
        title: 'Undone',
        description: `Undid: ${description}`,
        duration: 2000,
      })
    }
  }, [toast])

  const redo = useCallback(async () => {
    const description = commandHistory.getRedoDescription()
    const success = await commandHistory.redo()
    
    if (success && description) {
      toast({
        title: 'Redone',
        description: `Redid: ${description}`,
        duration: 2000,
      })
    }
  }, [toast])

  const canUndo = commandHistory.canUndo()
  const canRedo = commandHistory.canRedo()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) {
          undo()
        }
      }
      
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo) {
          redo()
        }
      }
      
      // Ctrl+Y for redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo) {
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo])

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
```

#### 4. Update Components to Use Commands

```typescript
// src/components/AddTaskModal.tsx

import { CreateTaskCommand } from '../commands/taskCommands'
import { commandHistory } from '../utils/commandPattern'
import { useTasks } from '../store/useTasks'

export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const tasksStore = useTasks()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      const command = new CreateTaskCommand(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          completed: false,
          // ... other fields
        },
        tasksStore
      )

      await commandHistory.execute(command)
      
      // Reset form
      setTitle('')
      // ... reset other fields
      onOpenChange(false)
    } catch (error) {
      // Error already handled by commandHistory
    }
  }

  // ... rest of component
}
```

#### 5. Add Undo/Redo UI

```typescript
// src/components/UndoRedoButtons.tsx

import { Undo2, Redo2 } from 'lucide-react'
import { Button } from './ui/button'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  return (
    <TooltipProvider>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Shift+Z)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
```

---

## 📋 Implementation Checklist

### Phase 1: Error Handling (Week 1)
- [ ] Create error types and AppError class
- [ ] Implement ErrorHandler service
- [ ] Create ErrorBoundary component
- [ ] Replace console statements with logger
- [ ] Update store actions to use error handler
- [ ] Wrap app with ErrorBoundary
- [ ] Test error scenarios

### Phase 2: User Feedback (Week 1-2)
- [ ] Ensure all errors show user-friendly messages
- [ ] Add retry mechanisms for network errors
- [ ] Add loading states for async operations
- [ ] Add success feedback for important actions
- [ ] Test user feedback in various scenarios

### Phase 3: Undo/Redo (Week 2-3)
- [ ] Implement Command pattern
- [ ] Create CommandHistory manager
- [ ] Create task commands (Create, Update, Delete, Toggle)
- [ ] Create useUndoRedo hook
- [ ] Add keyboard shortcuts
- [ ] Update components to use commands
- [ ] Add Undo/Redo UI buttons
- [ ] Test undo/redo functionality

### Phase 4: Advanced Features (Week 3-4)
- [ ] Add batch operations support
- [ ] Add undo/redo for project operations
- [ ] Add undo/redo for tag operations
- [ ] Persist command history (optional)
- [ ] Add undo/redo history viewer
- [ ] Performance optimization for large histories

---

## 🎯 Success Criteria

### Error Handling
- ✅ All errors show user-friendly messages
- ✅ No silent failures
- ✅ Errors logged for debugging
- ✅ Error recovery mechanisms in place
- ✅ 0 console statements in production

### Undo/Redo
- ✅ Undo/redo works for all task operations
- ✅ Keyboard shortcuts functional
- ✅ UI buttons available
- ✅ History limited to prevent memory issues
- ✅ User feedback on undo/redo actions

---

**Last Updated**: Current analysis
**Next Review**: After implementing Phase 1
