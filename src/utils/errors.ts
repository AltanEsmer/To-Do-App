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

export class AppError extends Error {
  public timestamp: number

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
