/**
 * Check if running in Tauri environment
 * Checks multiple indicators to reliably detect Tauri v1.x
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  // Check for Tauri v1.x indicators:
  // - window.__TAURI__ - main Tauri object
  // - window.__TAURI_INTERNALS__ - internal Tauri APIs
  // - window.__TAURI_METADATA__ - Tauri metadata
  // Also check for the Tauri API in the global scope
  return (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_METADATA__' in window ||
    (window as any).__TAURI_IPC__ !== undefined
  )
}

/**
 * Safely invoke Tauri command with fallback for browser mode
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  try {
    // Always try to import and invoke Tauri command first
    // This is more reliable than checking isTauri() since detection might be incorrect
    const { invoke } = await import('@tauri-apps/api/tauri')
    return await invoke<T>(command, args)
  } catch (error) {
    // If invocation fails (e.g., Tauri not available, command doesn't exist, etc.)
    // Try fallback if provided
    if (fallback) {
      console.warn(`Tauri API not available for command "${command}", using fallback:`, error)
      return fallback()
    }
    // If no fallback and we're definitely not in Tauri, provide a helpful error
    if (!isTauri()) {
      return Promise.reject(
        new Error(`Tauri command "${command}" called in browser mode. Use npm run tauri:dev to run in Tauri.`)
      )
    }
    // Re-throw the original error if we think we're in Tauri but invocation failed
    throw error
  }
}

