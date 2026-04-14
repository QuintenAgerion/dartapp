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

export function getMatchFormatLabelNL(format: string): string {
  const labels: Record<string, string> = {
    bo1: 'Best of 1',
    bo3: 'Best of 3',
    bo5: 'Best of 5',
  }
  return labels[format] ?? format
}

// Deterministic color accent for tournament cards based on ID hash
const TOURNAMENT_CARD_COLORS = [
  'border-l-4 border-l-sky-500',
  'border-l-4 border-l-emerald-500',
  'border-l-4 border-l-violet-500',
  'border-l-4 border-l-amber-500',
  'border-l-4 border-l-rose-500',
  'border-l-4 border-l-teal-500',
  'border-l-4 border-l-orange-500',
  'border-l-4 border-l-cyan-500',
] as const

export function getTournamentColorClass(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return TOURNAMENT_CARD_COLORS[hash % TOURNAMENT_CARD_COLORS.length]
}

// Deterministic color for group badges based on group letter (A=sky, B=emerald, etc.)
const GROUP_BADGE_COLORS = [
  'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  'bg-teal-500/20 text-teal-300 border border-teal-500/30',
] as const

export function getGroupColorClass(groupName: string): string {
  const letter = groupName.replace(/.*?([A-Z])[^A-Z]*$/i, '$1').toUpperCase()
  const index = Math.max(0, letter.charCodeAt(0) - 65)
  return GROUP_BADGE_COLORS[index % GROUP_BADGE_COLORS.length]
}

export function getRequiredLegs(format: string): number {
  const legs: Record<string, number> = {
    bo1: 1,
    bo3: 2,
    bo5: 3,
  }
  return legs[format] ?? 1
}
