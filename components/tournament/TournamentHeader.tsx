import type { Tournament } from '@/types/database'
import { TournamentStatusBadge } from '@/components/ui/Badge'
import { formatDate, getMatchFormatLabel } from '@/lib/utils'

interface TournamentHeaderProps {
  tournament: Tournament
  playerCount?: number
}

export function TournamentHeader({ tournament, playerCount }: TournamentHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">{tournament.name}</h1>
            <TournamentStatusBadge status={tournament.status} />
          </div>
          {tournament.description && (
            <p className="mt-1 text-slate-400">{tournament.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
        {tournament.start_date && (
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(tournament.start_date)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {getMatchFormatLabel(tournament.match_format)}
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
          {tournament.num_groups} group{tournament.num_groups !== 1 ? 's' : ''}
          {playerCount != null && ` · ${playerCount} player${playerCount !== 1 ? 's' : ''}`}
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {tournament.num_boards} board{tournament.num_boards !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
