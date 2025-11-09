import { useMemo } from 'react'
import { Task } from '../store/useTasks'
import { useTaskFilters } from '../store/useTaskFilters'
import { isDateToday, isOverdue } from './dateHelpers'

/**
 * Custom hook to filter and sort tasks based on current filter state
 */
export function useFilteredTasks(tasks: Task[]) {
  const { searchQuery, filter, sortBy, selectedTags, groupByTag } = useTaskFilters()

  return useMemo(() => {
    let filtered = [...tasks]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      )
    }

    // Apply tag filter (AND logic - task must have ALL selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((task) => {
        if (!task.tags || task.tags.length === 0) return false
        return selectedTags.every((selectedTagId) =>
          task.tags!.some((tag) => tag.id === selectedTagId)
        )
      })
    }

    // Apply status/date filters
    const now = new Date()
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    switch (filter) {
      case 'active':
        filtered = filtered.filter((task) => !task.completed)
        break
      case 'completed':
        filtered = filtered.filter((task) => task.completed)
        break
      case 'today':
        filtered = filtered.filter((task) => task.dueDate && isDateToday(task.dueDate))
        break
      case 'week':
        filtered = filtered.filter(
          (task) => task.dueDate && task.dueDate >= now && task.dueDate <= weekFromNow
        )
        break
      case 'overdue':
        filtered = filtered.filter((task) => task.dueDate && !task.completed && isOverdue(task.dueDate))
        break
      case 'all':
      default:
        // No additional filtering
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.getTime() - b.dueDate.getTime()

        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }

        case 'title':
          return a.title.localeCompare(b.title)

        case 'project':
          if (!a.projectId && !b.projectId) return 0
          if (!a.projectId) return 1
          if (!b.projectId) return -1
          return (a.projectId || '').localeCompare(b.projectId || '')

        case 'created':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime()
      }
    })

    return filtered
  }, [tasks, searchQuery, filter, sortBy, selectedTags, groupByTag])
}

/**
 * Group tasks by their tags
 */
export function useGroupedByTag(tasks: Task[]) {
  return useMemo(() => {
    const grouped = new Map<string, Task[]>()
    
    tasks.forEach((task) => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach((tag) => {
          const existing = grouped.get(tag.id) || []
          grouped.set(tag.id, [...existing, task])
        })
      } else {
        // Tasks without tags go to "Untagged" group
        const existing = grouped.get('__untagged__') || []
        grouped.set('__untagged__', [...existing, task])
      }
    })

    return grouped
  }, [tasks])
}

