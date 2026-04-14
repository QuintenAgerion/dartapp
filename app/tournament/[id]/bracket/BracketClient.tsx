'use client'

import { useMemo } from 'react'
import type { Tournament, Bracket, BracketMatch, TournamentMember, MatchFormat } from '@/types/database'
import { BracketView } from '@/components/bracket/BracketView'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeTournament } from '@/hooks/useRealtimeTournament'
import type { UserRole } from '@/lib/tournament/permissions'

interface BracketClientProps {
  tournamentId: string
  tournament: Tournament
  brackets: Bracket[]
  bracketMatches: BracketMatch[]
  members: TournamentMember[]
  role: UserRole
}

export function BracketClient({
  tournamentId,
  tournament,
  brackets,
  bracketMatches,
  members,
  role,
}: BracketClientProps) {
  const { bracketMatches: realtimeMatches } = useRealtimeTournament(tournamentId)

  const allMatches = useMemo(() => {
    if (realtimeMatches.length === 0) return bracketMatches
    const map = new Map(bracketMatches.map((m) => [m.id, m]))
    for (const m of realtimeMatches) map.set(m.id, m)
    return Array.from(map.values())
  }, [bracketMatches, realtimeMatches])

  const winnersBracket = brackets.find((b) => b.type === 'winners')
  const losersBracket = brackets.find((b) => b.type === 'losers')

  const winnersMatches = winnersBracket
    ? allMatches.filter((m) => m.bracket_id === winnersBracket.id)
    : []
  const losersMatches = losersBracket
    ? allMatches.filter((m) => m.bracket_id === losersBracket.id)
    : []

  const canSubmit = role === 'organizer' || role === 'player'

  if (tournament.status === 'draft') {
    return (
      <EmptyState
        title="Tournament not started"
        description="The bracket will be generated after the group stage completes"
      />
    )
  }

  if (brackets.length === 0) {
    return (
      <EmptyState
        title="No bracket yet"
        description={
          role === 'organizer'
            ? 'Go to the Overview tab and click "Generate Bracket" to create the knockout stage.'
            : 'The bracket has not been generated yet. The organizer can generate it from the Overview tab.'
        }
      />
    )
  }

  return (
    <div className="space-y-10">
      {winnersMatches.length > 0 && (
        <BracketView
          matches={winnersMatches}
          members={members}
          format={tournament.match_format as MatchFormat}
          canSubmitScore={canSubmit}
          title={losersBracket ? "Winners Bracket" : undefined}
        />
      )}

      {losersMatches.length > 0 && (
        <BracketView
          matches={losersMatches}
          members={members}
          format={tournament.match_format as MatchFormat}
          canSubmitScore={canSubmit}
          title="Losers Bracket"
        />
      )}
    </div>
  )
}
