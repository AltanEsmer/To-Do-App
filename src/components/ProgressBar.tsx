/**
 * Progress bar component to show completion percentage
 */
interface ProgressBarProps {
  completed: number
  total: number
  className?: string
}

export function ProgressBar({ completed, total, className = '' }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {completed} of {total} tasks completed ({percentage}%)
      </p>
    </div>
  )
}

