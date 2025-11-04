import { format, isToday, isPast, isFuture, startOfDay } from 'date-fns'

/**
 * Formats a date for display in task cards
 */
export function formatTaskDate(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  if (isPast(startOfDay(date))) {
    return format(date, 'MMM d, yyyy')
  }
  if (isFuture(startOfDay(date))) {
    return format(date, 'MMM d')
  }
  return format(date, 'MMM d, yyyy')
}

/**
 * Checks if a date is today
 */
export function isDateToday(date: Date): boolean {
  return isToday(date)
}

/**
 * Checks if a date is overdue
 */
export function isOverdue(date: Date): boolean {
  return isPast(startOfDay(date)) && !isToday(date)
}

