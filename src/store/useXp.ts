import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface XpState {
  level: number
  currentXp: number
  totalXp: number
  xpToNextLevel: number
  streak: number
  hasLeveledUp: boolean
  newLevel: number | null
  grantXp: (xp: number, taskPriority?: string) => void
  resetLevelUp: () => void
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

export const useXp = create<XpState>()(
  persist(
    (set, get) => ({
      level: 1,
      currentXp: 0,
      totalXp: 0,
      xpToNextLevel: 100,
      streak: 0,
      hasLeveledUp: false,
      newLevel: null,

      calculateLevel,
      calculateXpToNextLevel,

      grantXp: (xp: number, taskPriority?: string) => {
        const state = get()
        const previousLevel = state.level
        const newTotalXp = Math.max(0, state.totalXp + xp)
        const newLevel = calculateLevel(newTotalXp)
        const newXpToNextLevel = calculateXpToNextLevel(newLevel)
        const newCurrentXp = calculateCurrentXp(newTotalXp, newLevel)

        // Detect level-up
        const leveledUp = newLevel > previousLevel

        set({
          totalXp: newTotalXp,
          level: newLevel,
          currentXp: newCurrentXp,
          xpToNextLevel: newXpToNextLevel,
          hasLeveledUp: leveledUp,
          newLevel: leveledUp ? newLevel : null,
        })
      },

      resetLevelUp: () => {
        set({
          hasLeveledUp: false,
          newLevel: null,
        })
      },
    }),
    {
      name: 'xp-storage',
      partialize: (state) => ({
        level: state.level,
        currentXp: state.currentXp,
        totalXp: state.totalXp,
        xpToNextLevel: state.xpToNextLevel,
        streak: state.streak,
      }),
    }
  )
)

