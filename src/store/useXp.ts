import { create } from 'zustand'
import * as tauriAdapter from '../api/tauriAdapter'
import { toast } from '../components/ui/use-toast'

interface XpState {
  level: number
  currentXp: number
  totalXp: number
  xpToNextLevel: number
  streak: number
  badges: tauriAdapter.Badge[]
  hasLeveledUp: boolean
  newLevel: number | null
  grantXp: (xp: number, source: string, taskId?: string) => Promise<void>
  resetLevelUp: () => void
  syncFromBackend: () => Promise<void>
  loadBadges: () => Promise<void>
  checkBadges: () => Promise<void>
  calculateLevel: (totalXp: number) => number
  calculateXpToNextLevel: (level: number) => number
}

/**
 * Calculate level from total XP
 * Formula: level = floor(sqrt(totalXp / 100)) + 1
 */
function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1
}

/**
 * Calculate XP needed for next level
 * Formula: xpToNextLevel = (level * 100) * level
 */
function calculateXpToNextLevel(level: number): number {
  return level * 100 * level
}

/**
 * Calculate current XP within current level
 * XP needed for level N = sum of XP needed for all previous levels
 */
function calculateCurrentXp(totalXp: number, level: number): number {
  if (level === 1) {
    return totalXp
  }
  // Calculate total XP needed to reach current level
  let xpForCurrentLevel = 0
  for (let i = 1; i < level; i++) {
    xpForCurrentLevel += calculateXpToNextLevel(i)
  }
  return totalXp - xpForCurrentLevel
}

export const useXp = create<XpState>()((set, get) => ({
  level: 1,
  currentXp: 0,
  totalXp: 0,
  xpToNextLevel: 100,
  streak: 0,
  badges: [],
  hasLeveledUp: false,
  newLevel: null,

  calculateLevel,
  calculateXpToNextLevel,

  syncFromBackend: async () => {
    try {
      const progress = await tauriAdapter.getUserProgress()
      const level = calculateLevel(progress.total_xp)
      const xpToNextLevel = calculateXpToNextLevel(level)
      const currentXp = calculateCurrentXp(progress.total_xp, level)

      set({
        level,
        currentXp,
        totalXp: progress.total_xp,
        xpToNextLevel,
        streak: progress.current_streak,
      })
      
      console.log('XP synced from backend:', { level, currentXp, totalXp: progress.total_xp, xpToNextLevel, streak: progress.current_streak })
    } catch (error) {
      console.error('Failed to sync XP from backend:', error)
      // Keep default values on error - they're already set in initial state
    }
  },

  loadBadges: async () => {
    try {
      const badges = await tauriAdapter.getBadges()
      set({ badges })
    } catch (error) {
      console.error('Failed to load badges:', error)
    }
  },

  checkBadges: async () => {
    try {
      const newlyAwarded = await tauriAdapter.checkAndAwardBadges()
      if (newlyAwarded.length > 0) {
        // Reload badges
        await get().loadBadges()
        
        // Show notifications for new badges
        newlyAwarded.forEach((badge) => {
          const badgeNames: Record<string, string> = {
            first_task: 'First Task',
            task_master_100: 'Task Master',
            week_warrior: 'Week Warrior',
            level_10: 'Level 10',
          }
          
          toast({
            title: `🏆 Badge Earned!`,
            description: badgeNames[badge.badge_type] || badge.badge_type,
            variant: 'success',
            duration: 5000,
          })
        })
      }
    } catch (error) {
      console.error('Failed to check badges:', error)
    }
  },

  grantXp: async (xp: number, source: string, taskId?: string) => {
    try {
      const state = get()
      const previousLevel = state.level
      
      const result = await tauriAdapter.grantXp(xp, source, taskId)
      
      // Detect level-up
      const leveledUp = result.level_up

      set({
        totalXp: result.total_xp,
        level: result.new_level,
        currentXp: result.current_xp,
        xpToNextLevel: result.xp_to_next_level,
        hasLeveledUp: leveledUp,
        newLevel: leveledUp ? result.new_level : null,
      })

      // Check for badges after XP grant
      if (leveledUp) {
        await get().checkBadges()
      }
    } catch (error) {
      console.error('Failed to grant XP:', error)
      // Fallback to local calculation if backend fails
      const state = get()
      const previousLevel = state.level
      const newTotalXp = Math.max(0, state.totalXp + xp)
      const newLevel = calculateLevel(newTotalXp)
      const newXpToNextLevel = calculateXpToNextLevel(newLevel)
      const newCurrentXp = calculateCurrentXp(newTotalXp, newLevel)
      const leveledUp = newLevel > previousLevel

      set({
        totalXp: newTotalXp,
        level: newLevel,
        currentXp: newCurrentXp,
        xpToNextLevel: newXpToNextLevel,
        hasLeveledUp: leveledUp,
        newLevel: leveledUp ? newLevel : null,
      })
    }
  },

  resetLevelUp: () => {
    set({
      hasLeveledUp: false,
      newLevel: null,
    })
  },
}))

