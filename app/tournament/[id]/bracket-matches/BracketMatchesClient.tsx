'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, Bracket, BracketMatch, TournamentMember, MatchFormat } from '@/types/database'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScoreInputModal } from '@/components/tournament/ScoreInputModal'
import { MatchStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useRealtimeTournament } from '@/hooks/useRealtimeTournament'
import type { UserRole } from '@/lib/tournament/permissions'
import { cn, formatDate } from '@/lib/utils'

interface BracketMatchesClientProps {
  tournamentId: string
  tournament: Tournament
  brackets: Bracket[]
  bracketMatches: BracketMatch[]
  members: TournamentMember[]
  role: UserRole
  myMemberId: string | null
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Halve Finale'
  if (fromEnd === 2) return 'Kwartfinale'
  return `Ronde ${round}`
}

export function BracketMatchesClient({
  tournamentId,
  tournament,
  brackets,
  bracketMatches,
  members,
  role,
  myMemberId,
}: BracketMatchesClientProps) {
  const { bracketMatches: realtimeMatches } = useRealtimeTournament(tournamentId)
  const [modalMatch, setModalMatch] = useState<BracketMatch | null>(null)
  const router = useRouter()

  const allMatches = useMemo(() => {
    if (realtimeMatches.length === 0) return bracketMatches
    const map = new Map(bracketMatches.map((m) => [m.id, m]))
    for (const m of realtimeMatches) map.set(m.id, m)
    return Array.from(map.values())
  }, [bracketMatches, realtimeMatches])

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  )

  const winnersBracket = brackets.find((b) => b.type === 'winners')
  const losersBracket = brackets.find((b) => b.type === 'losers')

  if (tournament.status === 'draft') {
    return (
      <EmptyState
        title="Toernooi nog niet gestart"
        description="Start het toernooi eerst om poules en wedstrijden te genereren."
      />
    )
  }

  if (brackets.length === 0) {
    return (
      <EmptyState
        title="Nog geen bracket"
        description={
          role === 'organizer'
            ? 'Ga naar het Overzicht-tabblad en klik op "Bracket genereren" om de knockoutfase aan te maken.'
            : 'De bracket is nog niet gegenereerd. De organisator kan dit doen via het Overzicht-tabblad.'
        }
      />
    )
  }

  function canSubmit(match: BracketMatch): boolean {
    if (match.status === 'pending') return false
    if (role === 'organizer') return true
    if (role === 'player' && myMemberId) {
      return match.home_member_id === myMemberId || match.away_member_id === myMemberId
    }
    return false
  }

  function renderBracketSection(bracket: Bracket, title: string) {
    const matches = allMatches
      .filter((m) => m.bracket_id === bracket.id)
      .sort((a, b) => a.round - b.round || a.match_number - b.match_number)

    if (matches.length === 0) return null

    const maxRound = Math.max(...matches.map((m) => m.round))

    // Group by round
    const byRound = new Map<number, BracketMatch[]>()
    for (const m of matches) {
      const arr = byRound.get(m.round) ?? []
      arr.push(m)
      byRound.set(m.round, arr)
    }

    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-stone-800">{title}</h2>
        {[...byRound.entries()].map(([round, roundMatches]) => (
          <div key={round}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              {roundLabel(round, maxRound)}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {roundMatches.map((match) => {
                const home = match.home_member_id ? memberMap.get(match.home_member_id) : null
                const away = match.away_member_id ? memberMap.get(match.away_member_id) : null
                const isCompleted = match.status === 'completed'
                const isPending = match.status === 'pending'

                return (
                  <div
                    key={match.id}
                    className={cn(
                      'card transition-all',
                      match.status === 'live' && 'border-green-500/40 bg-green-500/5'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        {match.board_number && <span>Bord {match.board_number}</span>}
                        {match.board_number && match.scheduled_at && <span>·</span>}
                        {match.scheduled_at && !isCompleted && (
                          <span>{formatDate(match.scheduled_at)}</span>
                        )}
                        {match.match_format && (
                          <>
                            <span>·</span>
                            <span className="text-accent font-medium">
                              {match.match_format === 'bo1' ? 'BO1' : match.match_format === 'bo3' ? 'BO3' : 'BO5'}
                            </span>
                          </>
                        )}
                      </div>
                      <MatchStatusBadge status={match.status} />
                    </div>

                    {/* Players & Score */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex-1 text-right',
                        isCompleted && match.winner_member_id === match.home_member_id && 'text-accent'
                      )}>
                        <p className={cn(
                          'font-semibold',
                          isCompleted && match.winner_member_id === match.home_member_id
                            ? 'text-accent'
                            : home ? 'text-stone-800' : 'text-stone-400 italic text-sm'
                        )}>
                          {home?.display_name ?? 'TBD'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-2xl font-bold w-8 text-center',
                          isCompleted && match.winner_member_id === match.home_member_id
                            ? 'text-accent'
                            : 'text-stone-900'
                        )}>
                          {isPending ? '–' : match.home_score}
                        </span>
                        <span className="text-stone-400 font-light">—</span>
                        <span className={cn(
                          'text-2xl font-bold w-8 text-center',
                          isCompleted && match.winner_member_id === match.away_member_id
                            ? 'text-accent'
                            : 'text-stone-900'
                        )}>
                          {isPending ? '–' : match.away_score}
                        </span>
                      </div>

                      <div className={cn(
                        'flex-1',
                        isCompleted && match.winner_member_id === match.away_member_id && 'text-accent'
                      )}>
                        <p className={cn(
                          'font-semibold',
                          isCompleted && match.winner_member_id === match.away_member_id
                            ? 'text-accent'
                            : away ? 'text-stone-800' : 'text-stone-400 italic text-sm'
                        )}>
                          {away?.display_name ?? 'TBD'}
                        </p>
                      </div>
                    </div>

                    {/* Scorer */}
                    {match.scorer_member_id && memberMap.get(match.scorer_member_id) && (
                      <div className="mt-2 text-xs text-stone-500 text-center">
                        Schrijver: <span className="text-stone-500">{memberMap.get(match.scorer_member_id)!.display_name}</span>
                      </div>
                    )}

                    {/* Action */}
                    {canSubmit(match) && (!isCompleted || role === 'organizer') && home && away && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setModalMatch(match)}
                        >
                          {isCompleted ? 'Score bewerken' : match.status === 'live' ? 'Score bijwerken' : 'Score invoeren'}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const homeMember = modalMatch?.home_member_id ? memberMap.get(modalMatch.home_member_id) : null
  const awayMember = modalMatch?.away_member_id ? memberMap.get(modalMatch.away_member_id) : null

  return (
    <div className="space-y-8">
      {winnersBracket && renderBracketSection(
        winnersBracket,
        losersBracket ? 'Winnaarsbracket' : 'Bracketwedstrijden'
      )}
      {losersBracket && renderBracketSection(losersBracket, 'Verlizersbracket')}

      {modalMatch && homeMember && awayMember && (
        <ScoreInputModal
          open={true}
          onClose={() => setModalMatch(null)}
          matchId={modalMatch.id}
          homeMember={homeMember}
          awayMember={awayMember}
          format={(modalMatch.match_format ?? tournament.match_format) as MatchFormat}
          isBracket={true}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  )
}
