'use client'

import { useMemo, useState } from 'react'
import type { Tournament, Group, TournamentMember, GroupMatch, MatchFormat } from '@/types/database'
import { MatchCard } from '@/components/matches/MatchCard'
import { MatchFilter, type MatchFilters } from '@/components/matches/MatchFilter'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeTournament } from '@/hooks/useRealtimeTournament'
import type { UserRole } from '@/lib/tournament/permissions'

interface MatchesClientProps {
  tournamentId: string
  tournament: Tournament
  groups: Group[]
  members: TournamentMember[]
  initialMatches: GroupMatch[]
  role: UserRole
  myMemberId: string | null
  avatarMap: Record<string, string>
}

export function MatchesClient({
  tournamentId,
  tournament,
  groups,
  members,
  initialMatches,
  role,
  myMemberId,
  avatarMap,
}: MatchesClientProps) {
  const [filters, setFilters] = useState<MatchFilters>({
    status: 'all',
    groupId: null,
    round: null,
    boardNumber: null,
  })

  const { groupMatches: realtimeMatches } = useRealtimeTournament(tournamentId)

  // Merge initial + realtime (realtime overrides)
  const matches = useMemo(() => {
    if (realtimeMatches.length === 0) return initialMatches
    const map = new Map(initialMatches.map((m) => [m.id, m]))
    for (const m of realtimeMatches) map.set(m.id, m)
    return Array.from(map.values())
  }, [initialMatches, realtimeMatches])

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  )

  const groupMap = useMemo(
    () => new Map(groups.map((g) => [g.id, g])),
    [groups]
  )

  const rounds = useMemo(
    () => [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b),
    [matches]
  )

  const boards = useMemo(
    () => [...new Set(matches.map((m) => m.board_number).filter((b): b is number => b !== null))].sort((a, b) => a - b),
    [matches]
  )

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filters.status !== 'all' && m.status !== filters.status) return false
      if (filters.groupId && m.group_id !== filters.groupId) return false
      if (filters.round && m.round !== filters.round) return false
      if (filters.boardNumber && m.board_number !== filters.boardNumber) return false
      return true
    })
  }, [matches, filters])

  function canSubmitScore(match: GroupMatch): boolean {
    if (role === 'organizer') return true
    if (role === 'player' && myMemberId) {
      return (
        match.home_member_id === myMemberId ||
        match.away_member_id === myMemberId
      )
    }
    return false
  }

  return (
    <div className="space-y-4">
      <MatchFilter
        filters={filters}
        onChange={setFilters}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        rounds={rounds}
        boards={boards}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={
            tournament.status === 'draft'
              ? 'Tournament not started yet'
              : 'No matches found'
          }
          description={
            tournament.status === 'draft'
              ? 'Start the tournament to generate group matches'
              : 'Try adjusting the filters'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((match) => {
            const home = memberMap.get(match.home_member_id)
            const away = memberMap.get(match.away_member_id)
            const group = groupMap.get(match.group_id)

            if (!home || !away) return null

            const scorer = match.scorer_member_id ? memberMap.get(match.scorer_member_id) : null

            return (
              <MatchCard
                key={match.id}
                match={match}
                homeMember={home}
                awayMember={away}
                format={tournament.match_format as MatchFormat}
                canSubmitScore={canSubmitScore(match)}
                isOrganizer={role === 'organizer'}
                groupName={group?.name}
                scorerMember={scorer}
                homeAvatar={avatarMap[match.home_member_id] ?? null}
                awayAvatar={avatarMap[match.away_member_id] ?? null}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
