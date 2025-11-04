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
  // - window.__TAURI_IPC__ - IPC handler
  // Also check for the Tauri API in the global scope
  const win = window as any
  
  // Check multiple indicators
  const hasTauriIndicators = 
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_METADATA__' in window ||
    '__TAURI_IPC__' in window ||
    win.__TAURI_IPC__ !== undefined ||
    win.__TAURI__ !== undefined ||
    // Check user agent (Tauri apps typically include this)
    (navigator.userAgent && navigator.userAgent.includes('Tauri'))
  
  // Also check if we can access the Tauri API through window
  // In Tauri v1, the API is injected into the window object
  if (hasTauriIndicators) {
    return true
  }
  
  // Additional check: if we're in an Electron-like environment but not Tauri,
  // we might still want to try (though this is less reliable)
  // For now, we'll be conservative and only return true if we have clear indicators
  return false
}

/**
 * Safely invoke Tauri command with fallback for browser mode
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  let importError: any = null
  
  try {
    // Always try to import and invoke Tauri command first
    // This is more reliable than checking isTauri() since detection might be incorrect
    const { invoke } = await import('@tauri-apps/api/tauri')
    return await invoke<T>(command, args)
  } catch (error: any) {
    importError = error
    
    // If import failed, try to access Tauri API directly from window object
    // This is a fallback for cases where dynamic import fails but Tauri is available
    const win = window as any
    
    // Try multiple ways to access Tauri invoke function
    let invokeFn: any = null
    
    // Method 1: Through __TAURI_INTERNALS__.ipc.invoke (Tauri v1 internal API)
    if (win.__TAURI_INTERNALS__?.ipc?.invoke) {
      invokeFn = win.__TAURI_INTERNALS__.ipc.invoke.bind(win.__TAURI_INTERNALS__.ipc)
    }
    // Method 2: Through __TAURI__ object (if available)
    else if (win.__TAURI__?.tauri?.invoke) {
      invokeFn = win.__TAURI__.tauri.invoke.bind(win.__TAURI__.tauri)
    }
    // Method 3: Direct IPC handler
    else if (win.__TAURI_IPC__?.invoke) {
      invokeFn = win.__TAURI_IPC__.invoke.bind(win.__TAURI_IPC__)
    }
    
    if (invokeFn) {
      try {
        console.warn(`Using window Tauri API as fallback for command "${command}"`)
        return await invokeFn(command, args)
      } catch (windowInvokeError: any) {
        // If window invoke also fails, use the window error instead
        importError = windowInvokeError
      }
    }
    
    // Log the error for debugging
    console.error(`Tauri invoke failed for command "${command}":`, importError)
    console.error('Error details:', {
      message: importError?.message,
      code: importError?.code,
      stack: importError?.stack,
      isTauri: isTauri(),
      hasWindowTauri: !!(window as any).__TAURI__
    })
    
    // If we're in a Tauri environment (detected by isTauri()), we should NOT use fallback
    // as this indicates a real Tauri command error that should be surfaced
    if (isTauri()) {
      // We're in Tauri, so this is a real error - don't use fallback
      // Re-throw the error so it can be handled properly
      throw importError
    }
    
    // Check if it's a Tauri-specific command error (command not found, etc.)
    // These should be re-thrown as they indicate actual Tauri issues
    if (importError?.message?.includes('command') || importError?.message?.includes('not found')) {
      // This is a Tauri command error, re-throw it
      throw importError
    }
    
    // If we get here, we're likely in browser mode and the import failed
    // Try fallback if provided
    if (fallback) {
      console.warn(`Tauri API not available for command "${command}", using fallback`)
      return fallback()
    }
    
    // If no fallback and we're definitely not in Tauri, provide a helpful error
    return Promise.reject(
      new Error(`Tauri command "${command}" called in browser mode. Use npm run tauri:dev to run in Tauri.`)
    )
  }
}

