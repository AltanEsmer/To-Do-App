import { toast } from '../components/ui/use-toast'
import { ErrorCode, AppError } from '../utils/errors'

class ErrorHandler {
  private errorLog: AppError[] = []
  private maxLogSize = 100

  handleError(error: unknown, context?: Record<string, unknown>): void {
    const appError = this.normalizeError(error, context)
    
    this.logError(appError)
    this.showUserFeedback(appError)
    this.trackError(appError)
  }

  private normalizeError(
    error: unknown, 
    context?: Record<string, unknown>
  ): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const tauriError = error as { message: string; code?: string }
      
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

    if (error instanceof Error) {
      return new AppError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        'An unexpected error occurred. Please try again.',
        error,
        context
      )
    }

    return new AppError(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      'An unexpected error occurred. Please try again.',
      error,
      context
    )
  }

  private logError(error: AppError): void {
    this.errorLog.push(error)
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift()
    }

    console.error('[ErrorHandler]', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
    })
  }

  private showUserFeedback(error: AppError): void {
    toast({
      title: 'Error',
      description: error.userMessage,
      variant: 'destructive',
      duration: 5000,
    })
  }

  private trackError(error: AppError): void {
    // Future: Send to error tracking service (e.g., Sentry)
    // For now, just log to console in development
    if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.warn('[Error Tracking]', error)
    }
  }

  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  clearErrorLog(): void {
    this.errorLog = []
  }
}

export const errorHandler = new ErrorHandler()
