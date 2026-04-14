import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function getMatchFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    bo1: 'Best of 1',
    bo3: 'Best of 3',
    bo5: 'Best of 5',
  }
  return labels[format] ?? format
}

export function getRequiredLegs(format: string): number {
  const legs: Record<string, number> = {
    bo1: 1,
    bo3: 2,
    bo5: 3,
  }
  return legs[format] ?? 1
}
