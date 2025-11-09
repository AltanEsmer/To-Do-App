import React from 'react'
import { Badge } from './ui/badge'
import { X } from 'lucide-react'
import { Tag } from '../store/useTags'

interface TagBadgeProps {
  tag: Tag
  onClick?: () => void
  onRemove?: () => void
  removable?: boolean
  clickable?: boolean
  showUsageCount?: boolean
}

export function TagBadge({ 
  tag, 
  onClick, 
  onRemove, 
  removable = false, 
  clickable = true,
  showUsageCount = false 
}: TagBadgeProps) {
  const style = tag.color ? {
    backgroundColor: `${tag.color}20`,
    borderColor: tag.color,
    color: tag.color,
  } : undefined

  return (
    <Badge
      variant="outline"
      style={style}
      className={`
        inline-flex items-center gap-1 text-xs font-medium
        ${clickable && onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${removable ? 'pr-1' : ''}
      `}
      onClick={onClick && !removable ? onClick : undefined}
      title={showUsageCount ? `Used in ${tag.usage_count} tasks` : undefined}
    >
      <span>{tag.name}</span>
      {showUsageCount && (
        <span className="text-xs opacity-60">({tag.usage_count})</span>
      )}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  )
}
