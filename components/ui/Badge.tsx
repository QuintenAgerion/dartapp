import { cn } from '@/lib/utils'
import type { TournamentStatus, MatchStatus, BracketMatchStatus, MemberRole } from '@/types/database'

type BadgeColor = 'gray' | 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'orange'

interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  gray:   'bg-stone-100 text-stone-500 border-stone-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-amber-100 text-amber-700 border-amber-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
}

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
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
    draft:     { label: 'Concept',   color: 'yellow' },
    active:    { label: 'Actief',    color: 'green'  },
    completed: { label: 'Afgelopen', color: 'blue'   },
  }
  const { label, color } = map[status]
  return <Badge color={color}>{label}</Badge>
}

export function MatchStatusBadge({ status }: { status: MatchStatus | BracketMatchStatus }) {
  const map: Record<string, { label: string; color: BadgeColor }> = {
    scheduled: { label: 'Gepland',    color: 'gray'   },
    pending:   { label: 'In wachtrij', color: 'gray'  },
    live:      { label: 'Live',        color: 'green'  },
    completed: { label: 'Gespeeld',    color: 'blue'   },
  }
  const { label, color } = map[status] ?? { label: status, color: 'gray' as BadgeColor }
  return <Badge color={color}>{label}</Badge>
}

export function RoleBadge({ role }: { role: MemberRole }) {
  const map: Record<MemberRole, { label: string; color: BadgeColor }> = {
    organizer: { label: 'Organisator',  color: 'orange' },
    player:    { label: 'Speler',        color: 'blue'   },
    viewer:    { label: 'Toeschouwer',   color: 'gray'   },
  }
  const { label, color } = map[role]
  return <Badge color={color}>{label}</Badge>
}
