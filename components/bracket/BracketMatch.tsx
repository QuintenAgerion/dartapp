'use client'

import { useState } from 'react'
import type { BracketMatch, TournamentMember, MatchFormat } from '@/types/database'
import { ScoreInputModal } from '@/components/tournament/ScoreInputModal'
import { cn } from '@/lib/utils'

interface BracketMatchProps {
  match: BracketMatch
  homeMember: TournamentMember | null
  awayMember: TournamentMember | null
  format: MatchFormat
  canSubmitScore: boolean
  roundLabel?: string
}

export function BracketMatchCard({
  match,
  homeMember,
  awayMember,
  format,
  canSubmitScore,
  roundLabel,
}: BracketMatchProps) {
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const isCompleted = match.status === 'completed'
  const isLive = match.status === 'live'
  const canPlay = match.home_member_id && match.away_member_id

  return (
    <>
      <div
        className={cn(
          'relative w-48 rounded-xl border transition-all',
          isLive
            ? 'border-green-500/50 bg-green-500/5 shadow-green-500/10 shadow-md'
            : 'border-border bg-surface',
          canPlay && canSubmitScore && !isCompleted && 'cursor-pointer hover:border-stone-400',
          !canPlay && 'opacity-60'
        )}
        onClick={() => {
          if (canPlay && canSubmitScore && !isCompleted && homeMember && awayMember) {
            setScoreModalOpen(true)
          }
        }}
      >
        {roundLabel && (
          <div className="absolute -top-5 left-0 text-xs text-stone-400 whitespace-nowrap">
            {roundLabel}
          </div>
        )}

        {/* Home player row */}
        <div className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50',
          isCompleted && match.winner_member_id === match.home_member_id && 'bg-accent/10'
        )}>
          <span className={cn(
            'text-sm truncate',
            isCompleted && match.winner_member_id === match.home_member_id
              ? 'text-accent font-semibold'
              : 'text-stone-700'
          )}>
            {homeMember?.display_name ?? (match.home_member_id ? '...' : 'TBD')}
          </span>
          <span className={cn(
            'text-sm font-bold shrink-0 w-5 text-right',
            isCompleted && match.winner_member_id === match.home_member_id
              ? 'text-accent'
              : 'text-stone-500'
          )}>
            {isCompleted || isLive ? match.home_score : ''}
          </span>
        </div>

        {/* Away player row */}
        <div className={cn(
          'flex items-center justify-between gap-2 px-3 py-2',
          isCompleted && match.winner_member_id === match.away_member_id && 'bg-accent/10'
        )}>
          <span className={cn(
            'text-sm truncate',
            isCompleted && match.winner_member_id === match.away_member_id
              ? 'text-accent font-semibold'
              : 'text-stone-700'
          )}>
            {awayMember?.display_name ?? (match.away_member_id ? '...' : 'TBD')}
          </span>
          <span className={cn(
            'text-sm font-bold shrink-0 w-5 text-right',
            isCompleted && match.winner_member_id === match.away_member_id
              ? 'text-accent'
              : 'text-stone-500'
          )}>
            {isCompleted || isLive ? match.away_score : ''}
          </span>
        </div>

        {isLive && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
          </div>
        )}
      </div>

      {canPlay && homeMember && awayMember && (
        <ScoreInputModal
          open={scoreModalOpen}
          onClose={() => setScoreModalOpen(false)}
          matchId={match.id}
          homeMember={homeMember}
          awayMember={awayMember}
          format={format}
          isBracket={true}
        />
      )}
    </>
  )
}
