class Logger {
  private isDevelopment = typeof window !== 'undefined' && (import.meta as any).env?.DEV

  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data)
    }
  }

  info(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, data)
    }
  }

  warn(message: string, data?: unknown): void {
    console.warn(`[WARN] ${message}`, data)
  }

  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`, error)
  }
}

export const logger = new Logger()
