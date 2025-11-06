import { useEffect, useState } from 'react'
import { Progress } from './progress'
import { useXp } from '@/store/useXp'

interface XPBarProps {
  className?: string
}

/**
 * XPBar component displaying current level, XP progress, and animated progress bar
 */
export function XPBar({ className }: XPBarProps) {
  const { level, currentXp, xpToNextLevel } = useXp()
  const [displayProgress, setDisplayProgress] = useState(0)

  // Calculate progress percentage
  const progress = xpToNextLevel > 0 ? (currentXp / xpToNextLevel) * 100 : 0

  // Animate progress bar when XP changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress)
    }, 50)

    return () => clearTimeout(timer)
  }, [progress])

  return (
    <div className={className} role="region" aria-label="XP Progress">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Level {level} • {currentXp} / {xpToNextLevel} XP
            </span>
            <span className="text-muted-foreground" aria-hidden="true">
              {Math.round(progress)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Level ${level}, ${currentXp} of ${xpToNextLevel} XP`}
          >
            <Progress value={displayProgress} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  )
}

