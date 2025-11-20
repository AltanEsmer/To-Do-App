/**
 * Image cache utility for optimizing background image loading
 * Implements in-memory caching with LRU eviction policy
 */

interface CacheEntry {
  url: string
  timestamp: number
  size: number
}

class ImageCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number = 50 * 1024 * 1024 // 50MB max cache size
  private currentSize: number = 0
  private maxAge: number = 30 * 60 * 1000 // 30 minutes max age

  /**
   * Get cached image URL or null if not found/expired
   */
  get(key: string): string | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.remove(key)
      return null
    }

    return entry.url
  }

  /**
   * Store image URL in cache
   */
  set(key: string, url: string, size: number = 0): void {
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.remove(key)
    }

    // Evict old entries if cache is full
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest()
    }

    this.cache.set(key, {
      url,
      timestamp: Date.now(),
      size,
    })
    this.currentSize += size
  }

  /**
   * Remove entry from cache and revoke blob URL
   */
  remove(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      URL.revokeObjectURL(entry.url)
      this.currentSize -= entry.size
      this.cache.delete(key)
    }
  }

  /**
   * Evict oldest entry from cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.remove(oldestKey)
    }
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    for (const [key] of this.cache.entries()) {
      this.remove(key)
    }
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
    }
  }
}

// Global image cache instance
export const imageCache = new ImageCache()
