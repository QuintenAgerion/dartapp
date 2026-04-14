'use client'

import { useState } from 'react'
import type { GroupMatch, TournamentMember, MatchFormat } from '@/types/database'
import { LiveBadge } from './LiveBadge'
import { MatchStatusBadge } from '@/components/ui/Badge'
import { ScoreInputModal } from '@/components/tournament/ScoreInputModal'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatDate, cn, getGroupColorClass } from '@/lib/utils'

interface MatchCardProps {
  match: GroupMatch
  homeMember: TournamentMember
  awayMember: TournamentMember
  format: MatchFormat
  canSubmitScore: boolean
  isOrganizer?: boolean
  groupName?: string
  scorerMember?: TournamentMember | null
  homeAvatar?: string | null
  awayAvatar?: string | null
}

export function MatchCard({
  match,
  homeMember,
  awayMember,
  format,
  canSubmitScore,
  isOrganizer,
  groupName,
  scorerMember,
  homeAvatar,
  awayAvatar,
}: MatchCardProps) {
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'

  return (
    <>
      <div
        className={cn(
          'card transition-all',
          isLive && 'border-green-500/40 bg-green-500/5 shadow-green-500/10 shadow-lg'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {groupName && (
              <span className={cn('px-1.5 py-0.5 rounded font-medium text-xs', getGroupColorClass(groupName))}>
                {groupName}
              </span>
            )}
            {groupName && <span>·</span>}
            <span>Ronde {match.round}</span>
            {match.board_number && (
              <>
                <span>·</span>
                <span>Bord {match.board_number}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {match.scheduled_at && !isCompleted && (
              <span className="text-xs text-slate-500">{formatDate(match.scheduled_at)}</span>
            )}
            {isLive ? <LiveBadge /> : <MatchStatusBadge status={match.status} />}
          </div>
        </div>

        {/* Players & Score */}
        <div className="flex items-center gap-3">
          {/* Home player */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <p className={cn(
              'font-semibold text-right',
              isCompleted && match.winner_member_id === homeMember.id
                ? 'text-accent'
                : 'text-slate-200'
            )}>
              {homeMember.display_name}
            </p>
            <Avatar src={homeAvatar} name={homeMember.display_name} size="sm" />
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'text-2xl font-bold w-8 text-center',
              isCompleted && match.winner_member_id === homeMember.id ? 'text-accent' : 'text-slate-100'
            )}>
              {match.home_score}
            </span>
            <span className="text-slate-600 font-light">—</span>
            <span className={cn(
              'text-2xl font-bold w-8 text-center',
              isCompleted && match.winner_member_id === awayMember.id ? 'text-accent' : 'text-slate-100'
            )}>
              {match.away_score}
            </span>
          </div>

          {/* Away player */}
          <div className="flex-1 flex items-center gap-2">
            <Avatar src={awayAvatar} name={awayMember.display_name} size="sm" />
            <p className={cn(
              'font-semibold',
              isCompleted && match.winner_member_id === awayMember.id
                ? 'text-accent'
                : 'text-slate-200'
            )}>
              {awayMember.display_name}
            </p>
          </div>
        </div>

        {/* Scorer */}
        {scorerMember && (
          <div className="mt-2 text-xs text-slate-500 text-center">
            Schrijver: <span className="text-slate-400">{scorerMember.display_name}</span>
          </div>
        )}

        {/* Actions */}
        {canSubmitScore && (!isCompleted || isOrganizer) && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScoreModalOpen(true)}
            >
              {isCompleted ? 'Score bewerken' : isLive ? 'Score bijwerken' : 'Score invoeren'}
            </Button>
          </div>
        )}
      </div>

      <ScoreInputModal
        open={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        matchId={match.id}
        homeMember={homeMember}
        awayMember={awayMember}
        format={format}
        isBracket={false}
      />
    </>
  )
}
