import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { useXp } from '@/store/useXp'
import { Trophy } from 'lucide-react'

interface ProgressPanelProps {
  className?: string
}

const badgeNames: Record<string, string> = {
  first_task: 'First Task',
  task_master_100: 'Task Master',
  week_warrior: 'Week Warrior',
  level_10: 'Level 10',
}

/**
 * ProgressPanel component displaying user progress stats
 */
export function ProgressPanel({ className }: ProgressPanelProps) {
  const { level, totalXp, streak, badges } = useXp()
  const recentBadges = badges.slice(0, 5) // Show last 5 badges

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Progress</CardTitle>
        <CardDescription>Your gamification stats</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Level</span>
          <Badge variant="default">{level}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total XP</span>
          <span className="text-sm font-medium">{totalXp.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Streak</span>
          <span className="text-sm font-medium">{streak} days</span>
        </div>
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Badges</span>
            <span className="text-xs text-muted-foreground">{badges.length} earned</span>
          </div>
          {recentBadges.length > 0 ? (
            <div className="mt-2 space-y-1">
              {recentBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-2 text-xs"
                  title={badge.badge_type}
                >
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span className="text-foreground">
                    {badgeNames[badge.badge_type] || badge.badge_type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground italic">
              No badges yet. Complete tasks to earn badges!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

