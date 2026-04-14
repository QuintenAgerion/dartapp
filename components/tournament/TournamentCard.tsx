import Link from 'next/link'
import type { Tournament } from '@/types/database'
import { TournamentStatusBadge } from '@/components/ui/Badge'
import { formatDateShort, getMatchFormatLabel, getTournamentColorClass, cn } from '@/lib/utils'

interface TournamentCardProps {
  tournament: Tournament
  role?: 'organizer' | 'player' | 'viewer'
}

export function TournamentCard({ tournament, role }: TournamentCardProps) {
  return (
    <Link
      href={`/tournament/${tournament.id}`}
      className={cn('block card-hover group transition-all rounded-lg overflow-hidden', getTournamentColorClass(tournament.id))}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100 group-hover:text-accent transition-colors truncate">
              {tournament.name}
            </h3>
            <TournamentStatusBadge status={tournament.status} />
          </div>

          {tournament.description && (
            <p className="mt-1 text-sm text-slate-400 line-clamp-2">
              {tournament.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDateShort(tournament.start_date)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {getMatchFormatLabel(tournament.match_format)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              {tournament.num_groups} poule{tournament.num_groups !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {tournament.num_boards} bord{tournament.num_boards !== 1 ? 'en' : ''}
            </span>
          </div>
        </div>

        {role && (
          <span className="shrink-0 text-xs font-medium text-slate-500">
            {role === 'organizer' ? 'Organisator' : role === 'player' ? 'Speler' : 'Toeschouwer'}
          </span>
        )}
      </div>
    </Link>
  )
}
