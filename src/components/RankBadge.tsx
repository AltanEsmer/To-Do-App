import { RankTier, RankDivision, getRankDisplayName, getRankColor } from '../utils/rankSystem'
import { Trophy, Star, Crown, Gem } from 'lucide-react'
import clsx from 'clsx'

interface RankBadgeProps {
  tier: RankTier
  division: RankDivision
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  showIcon?: boolean
  className?: string
}

/**
 * Rank badge component displaying tier and division with icon
 */
export function RankBadge({
  tier,
  division,
  size = 'md',
  showLabel = true,
  showIcon = true,
  className = '',
}: RankBadgeProps) {
  const rankColor = getRankColor(tier)
  const rankName = getRankDisplayName(tier, division)

  // Select icon based on tier
  const getRankIcon = () => {
    switch (tier) {
      case 'challenger':
        return <Crown className={clsx(getSizeClass('icon'))} />
      case 'grandmaster':
        return <Star className={clsx(getSizeClass('icon'))} />
      case 'master':
      case 'diamond':
        return <Gem className={clsx(getSizeClass('icon'))} />
      default:
        return <Trophy className={clsx(getSizeClass('icon'))} />
    }
  }

  const getSizeClass = (type: 'container' | 'icon' | 'text') => {
    const sizes = {
      sm: {
        container: 'px-2 py-1 gap-1',
        icon: 'h-3 w-3',
        text: 'text-xs',
      },
      md: {
        container: 'px-3 py-1.5 gap-1.5',
        icon: 'h-4 w-4',
        text: 'text-sm',
      },
      lg: {
        container: 'px-4 py-2 gap-2',
        icon: 'h-5 w-5',
        text: 'text-base',
      },
      xl: {
        container: 'px-5 py-3 gap-2.5',
        icon: 'h-6 w-6',
        text: 'text-lg',
      },
    }
    return sizes[size][type]
  }

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full font-bold transition-all duration-200',
        getSizeClass('container'),
        className
      )}
      style={{
        backgroundColor: `${rankColor}20`,
        borderColor: rankColor,
        borderWidth: '2px',
        color: rankColor,
      }}
      title={rankName}
    >
      {showIcon && getRankIcon()}
      {showLabel && <span className={getSizeClass('text')}>{rankName}</span>}
    </div>
  )
}

interface RankProgressBarProps {
  progress: number
  tier: RankTier
  className?: string
}

/**
 * Progress bar for rank advancement
 */
export function RankProgressBar({ progress, tier, className = '' }: RankProgressBarProps) {
  const rankColor = getRankColor(tier)

  return (
    <div className={clsx('w-full', className)}>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Rank Progress</span>
        <span className="font-semibold">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: rankColor,
          }}
        />
      </div>
    </div>
  )
}
