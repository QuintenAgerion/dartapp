import { cn } from '@/lib/utils'
import type { TournamentStatus, MatchStatus, BracketMatchStatus, MemberRole } from '@/types/database'

type BadgeColor = 'gray' | 'green' | 'blue' | 'red' | 'yellow' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  gray: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClasses[color],
        className
      )}
    >
      {children}
    </span>
  )
}

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const map: Record<TournamentStatus, { label: string; color: BadgeColor }> = {
    draft: { label: 'Draft', color: 'yellow' },
    active: { label: 'Active', color: 'green' },
    completed: { label: 'Completed', color: 'blue' },
  }
  const { label, color } = map[status]
  return <Badge color={color}>{label}</Badge>
}

export function MatchStatusBadge({ status }: { status: MatchStatus | BracketMatchStatus }) {
  const map: Record<string, { label: string; color: BadgeColor }> = {
    scheduled: { label: 'Scheduled', color: 'gray' },
    pending: { label: 'Pending', color: 'gray' },
    live: { label: 'Live', color: 'green' },
    completed: { label: 'Completed', color: 'blue' },
  }
  const { label, color } = map[status] ?? { label: status, color: 'gray' as BadgeColor }
  return <Badge color={color}>{label}</Badge>
}

export function RoleBadge({ role }: { role: MemberRole }) {
  const map: Record<MemberRole, { label: string; color: BadgeColor }> = {
    organizer: { label: 'Organizer', color: 'purple' },
    player: { label: 'Player', color: 'blue' },
    viewer: { label: 'Viewer', color: 'gray' },
  }
  const { label, color } = map[role]
  return <Badge color={color}>{label}</Badge>
}
