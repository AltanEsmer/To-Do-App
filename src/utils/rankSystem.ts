/**
 * League of Legends-style rank achievement system
 */

export type RankTier =
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'grandmaster'
  | 'challenger'

export type RankDivision = 1 | 2 | 3 | 4 | null

export interface Rank {
  id: string
  user_id: string
  rank_tier: RankTier
  rank_division: RankDivision
  achieved_at: number
  total_xp_at_achievement: number
  level_at_achievement: number
}

export interface RankInfo {
  tier: RankTier
  division: RankDivision
  progress: number // 0-100
  xpForNextRank: number
  nextRank: { tier: RankTier; division: RankDivision } | null
}

// XP thresholds for each rank (cumulative total XP needed)
const RANK_THRESHOLDS: Record<string, number> = {
  'iron-4': 0,
  'iron-3': 1000,
  'iron-2': 2500,
  'iron-1': 4500,
  'bronze-4': 7000,
  'bronze-3': 10000,
  'bronze-2': 13500,
  'bronze-1': 17500,
  'silver-4': 22000,
  'silver-3': 27000,
  'silver-2': 32500,
  'silver-1': 38500,
  'gold-4': 45000,
  'gold-3': 52000,
  'gold-2': 59500,
  'gold-1': 67500,
  'platinum-4': 76000,
  'platinum-3': 85000,
  'platinum-2': 94500,
  'platinum-1': 104500,
  'diamond-4': 115000,
  'diamond-3': 126000,
  'diamond-2': 137500,
  'diamond-1': 149500,
  'master': 162000,
  'grandmaster': 180000,
  'challenger': 200000,
}

// Ordered list of all ranks
const RANK_ORDER: Array<{ tier: RankTier; division: RankDivision }> = [
  { tier: 'iron', division: 4 },
  { tier: 'iron', division: 3 },
  { tier: 'iron', division: 2 },
  { tier: 'iron', division: 1 },
  { tier: 'bronze', division: 4 },
  { tier: 'bronze', division: 3 },
  { tier: 'bronze', division: 2 },
  { tier: 'bronze', division: 1 },
  { tier: 'silver', division: 4 },
  { tier: 'silver', division: 3 },
  { tier: 'silver', division: 2 },
  { tier: 'silver', division: 1 },
  { tier: 'gold', division: 4 },
  { tier: 'gold', division: 3 },
  { tier: 'gold', division: 2 },
  { tier: 'gold', division: 1 },
  { tier: 'platinum', division: 4 },
  { tier: 'platinum', division: 3 },
  { tier: 'platinum', division: 2 },
  { tier: 'platinum', division: 1 },
  { tier: 'diamond', division: 4 },
  { tier: 'diamond', division: 3 },
  { tier: 'diamond', division: 2 },
  { tier: 'diamond', division: 1 },
  { tier: 'master', division: null },
  { tier: 'grandmaster', division: null },
  { tier: 'challenger', division: null },
]

/**
 * Get rank key for threshold lookup
 */
function getRankKey(tier: RankTier, division: RankDivision): string {
  return division ? `${tier}-${division}` : tier
}

/**
 * Calculate rank from total XP
 */
export function calculateRankFromXP(totalXp: number): { tier: RankTier; division: RankDivision } {
  let currentRank = RANK_ORDER[0]!

  for (const rank of RANK_ORDER) {
    const threshold = RANK_THRESHOLDS[getRankKey(rank.tier, rank.division)]
    if (threshold !== undefined && totalXp >= threshold) {
      currentRank = rank
    } else {
      break
    }
  }

  return currentRank
}

/**
 * Calculate progress towards next rank (0-100)
 */
export function calculateRankProgress(totalXp: number): number {
  const currentRank = calculateRankFromXP(totalXp)
  const currentIndex = RANK_ORDER.findIndex(
    (r) => r.tier === currentRank.tier && r.division === currentRank.division
  )

  if (currentIndex === RANK_ORDER.length - 1) {
    return 100 // Max rank
  }

  const nextRank = RANK_ORDER[currentIndex + 1]
  if (!nextRank) return 100

  const currentThreshold = RANK_THRESHOLDS[getRankKey(currentRank.tier, currentRank.division)]
  const nextThreshold = RANK_THRESHOLDS[getRankKey(nextRank.tier, nextRank.division)]

  if (currentThreshold === undefined || nextThreshold === undefined) return 0

  const xpInCurrentRank = totalXp - currentThreshold
  const xpNeededForNextRank = nextThreshold - currentThreshold

  return Math.min(100, Math.floor((xpInCurrentRank / xpNeededForNextRank) * 100))
}

/**
 * Get next rank after current rank
 */
export function getNextRank(
  currentTier: RankTier,
  currentDivision: RankDivision
): { tier: RankTier; division: RankDivision } | null {
  const currentIndex = RANK_ORDER.findIndex(
    (r) => r.tier === currentTier && r.division === currentDivision
  )

  if (currentIndex === -1 || currentIndex === RANK_ORDER.length - 1) {
    return null
  }

  return RANK_ORDER[currentIndex + 1] || null
}

/**
 * Get XP needed for next rank
 */
export function getXpForNextRank(currentTier: RankTier, currentDivision: RankDivision): number {
  const nextRank = getNextRank(currentTier, currentDivision)
  if (!nextRank) return 0

  const currentThreshold = RANK_THRESHOLDS[getRankKey(currentTier, currentDivision)]
  const nextThreshold = RANK_THRESHOLDS[getRankKey(nextRank.tier, nextRank.division)]

  if (currentThreshold === undefined || nextThreshold === undefined) return 0

  return nextThreshold - currentThreshold
}

/**
 * Get rank display name
 */
export function getRankDisplayName(tier: RankTier, division: RankDivision): string {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1)
  if (division) {
    const divisionRoman = ['IV', 'III', 'II', 'I'][4 - division]
    return `${tierName} ${divisionRoman}`
  }
  return tierName
}

/**
 * Get rank color (for UI styling)
 */
export function getRankColor(tier: RankTier): string {
  const colors: Record<RankTier, string> = {
    iron: '#4a4a4a',
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#00c7c7',
    diamond: '#b9f2ff',
    master: '#9966ff',
    grandmaster: '#ff3366',
    challenger: '#f4c430',
  }
  return colors[tier]
}

/**
 * Get full rank info from total XP
 */
export function getRankInfo(totalXp: number): RankInfo {
  const { tier, division } = calculateRankFromXP(totalXp)
  const progress = calculateRankProgress(totalXp)
  const nextRank = getNextRank(tier, division)
  const xpForNextRank = getXpForNextRank(tier, division)

  return {
    tier,
    division,
    progress,
    xpForNextRank,
    nextRank,
  }
}
