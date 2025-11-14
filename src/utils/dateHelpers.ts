import { format, isToday, isPast, isFuture, startOfDay, addDays, addWeeks, addMonths } from 'date-fns'
import { RecurrenceType } from '../store/useTasks'

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

/**
 * Calculates the next occurrence date for a recurring task
 * @param dueDate - Current due date of the task
 * @param recurrenceType - Type of recurrence (daily, weekly, monthly)
 * @param recurrenceInterval - Interval multiplier (e.g., 2 for "every 2 weeks")
 * @returns Next occurrence date or null if invalid
 */
export function getNextOccurrenceDate(
  dueDate: Date,
  recurrenceType: RecurrenceType,
  recurrenceInterval: number
): Date | null {
  if (recurrenceType === 'none' || !dueDate) return null
  
  const interval = Math.max(1, recurrenceInterval)
  
  switch (recurrenceType) {
    case 'daily':
      return addDays(dueDate, interval)
    case 'weekly':
      return addWeeks(dueDate, interval)
    case 'monthly':
      return addMonths(dueDate, interval)
    default:
      return null
  }
}

/**
 * Formats recurrence pattern for display
 * @param recurrenceType - Type of recurrence
 * @param recurrenceInterval - Interval multiplier
 * @returns Human-readable string (e.g., "Every 2 weeks")
 */
export function formatRecurrencePattern(
  recurrenceType: RecurrenceType,
  recurrenceInterval: number
): string {
  if (recurrenceType === 'none') return ''
  
  const interval = Math.max(1, recurrenceInterval)
  const typeLabel = recurrenceType === 'daily' ? 'day' : 
                    recurrenceType === 'weekly' ? 'week' : 'month'
  const plural = interval > 1 ? 's' : ''
  
  return interval === 1 
    ? `Every ${typeLabel}` 
    : `Every ${interval} ${typeLabel}${plural}`
}

