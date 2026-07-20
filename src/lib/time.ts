import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
} from 'date-fns'

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatHeaderDate(date: Date): string {
  return format(date, 'EEEE, MMMM d')
}

export function formatClock(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

export function formatEventDay(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export function formatEventTime(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return 'All day'
  return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
}
