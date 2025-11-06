import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { useXp } from '@/store/useXp'

interface ProgressPanelProps {
  className?: string
}

/**
 * ProgressPanel component displaying user progress stats
 */
export function ProgressPanel({ className }: ProgressPanelProps) {
  const { level, totalXp, streak } = useXp()

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
          <span className="text-xs text-muted-foreground">Badges</span>
          <div className="mt-2 text-xs text-muted-foreground italic">
            Coming soon...
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

