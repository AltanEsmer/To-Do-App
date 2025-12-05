export interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
  getDescription(): string
}

class CommandHistory {
  private history: Command[] = []
  private currentIndex = -1
  private maxHistorySize = 50
  private listeners: Set<() => void> = new Set()

  /**
   * Subscribe to history changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  async execute(command: Command): Promise<void> {
    try {
      await command.execute()
      
      // Clear any redo history when a new command is executed
      this.history = this.history.slice(0, this.currentIndex + 1)
      
      // Add new command to history
      this.history.push(command)
      this.currentIndex++
      
      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history.shift()
        this.currentIndex--
      }

      this.notify()
    } catch (error) {
      const { errorHandler } = await import('../services/errorHandler')
      errorHandler.handleError(error, { command: command.getDescription() })
      throw error
    }
  }

  async undo(): Promise<void> {
    if (!this.canUndo()) {
      return
    }

    try {
      const command = this.history[this.currentIndex]
      if (!command) return
      
      await command.undo()
      this.currentIndex--

      this.notify()

      const { toast } = await import('../components/ui/use-toast')
      toast({
        title: 'Undone',
        description: `${command.getDescription()} has been undone`,
        duration: 2000,
      })
    } catch (error) {
      const { errorHandler } = await import('../services/errorHandler')
      errorHandler.handleError(error, { action: 'undo' })
      throw error
    }
  }

  async redo(): Promise<void> {
    if (!this.canRedo()) {
      return
    }

    try {
      this.currentIndex++
      const command = this.history[this.currentIndex]
      if (!command) return
      
      await command.execute()

      this.notify()

      const { toast } = await import('../components/ui/use-toast')
      toast({
        title: 'Redone',
        description: `${command.getDescription()} has been redone`,
        duration: 2000,
      })
    } catch (error) {
      this.currentIndex--
      const { errorHandler } = await import('../services/errorHandler')
      errorHandler.handleError(error, { action: 'redo' })
      throw error
    }
  }

  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  getHistory(): string[] {
    return this.history.map((cmd) => cmd.getDescription())
  }
}

export const commandHistory = new CommandHistory()
