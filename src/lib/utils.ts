import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateNextScheduledTime(
  daysOfWeek: number[],
  callTimes: string[],
  fromDate: Date = new Date()
): Date | null {
  if (daysOfWeek.length === 0 || callTimes.length === 0) {
    return null
  }

  const now = new Date(fromDate)
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

  // Sort call times to find the next one today
  const sortedTimes = [...callTimes].sort()
  
  // Check if there's a call time later today
  for (const time of sortedTimes) {
    if (time > currentTime && daysOfWeek.includes(currentDay)) {
      const nextCall = new Date(now)
      const [hours, minutes] = time.split(':').map(Number)
      nextCall.setHours(hours, minutes, 0, 0)
      return nextCall
    }
  }

  // Find the next day with calls
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const checkDate = new Date(now)
    checkDate.setDate(now.getDate() + dayOffset)
    const checkDay = checkDate.getDay()
    
    if (daysOfWeek.includes(checkDay)) {
      const nextCall = new Date(checkDate)
      const [hours, minutes] = sortedTimes[0].split(':').map(Number)
      nextCall.setHours(hours, minutes, 0, 0)
      return nextCall
    }
  }

  return null
}

