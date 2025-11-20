import { useEffect } from 'react'
import { useXp } from '../store/useXp'
import { RankBadge, RankProgressBar } from './RankBadge'
import { getRankDisplayName, getNextRank } from '../utils/rankSystem'
import { TrendingUp } from 'lucide-react'

/**
 * Panel displaying user's rank and progress
 */
export function RankPanel() {
  const { 
    rankTier, 
    rankDivision, 
    rankProgress, 
    totalXp, 
    level,
    syncFromBackend 
  } = useXp()

  useEffect(() => {
    syncFromBackend()
  }, [syncFromBackend])

  const nextRank = getNextRank(rankTier, rankDivision)
  const currentRankName = getRankDisplayName(rankTier, rankDivision)
  const nextRankName = nextRank ? getRankDisplayName(nextRank.tier, nextRank.division) : 'Max Rank'

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Your Rank</h3>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mb-6 flex flex-col items-center justify-center space-y-3">
        <RankBadge tier={rankTier} division={rankDivision} size="xl" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Level {level}</p>
          <p className="text-xs text-muted-foreground">{totalXp.toLocaleString()} Total XP</p>
        </div>
      </div>

      {nextRank && (
        <>
          <RankProgressBar progress={rankProgress} tier={rankTier} className="mb-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Current: {currentRankName}</span>
            <span>Next: {nextRankName}</span>
          </div>
        </>
      )}

      {!nextRank && (
        <div className="rounded-lg bg-primary-50 p-3 text-center dark:bg-primary-900">
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
            🎉 You've reached the highest rank!
          </p>
        </div>
      )}
    </div>
  )
}
