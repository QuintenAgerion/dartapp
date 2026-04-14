'use client'

import { useMemo } from 'react'
import type { Tournament, Group, TournamentMember, GroupStanding } from '@/types/database'
import { StandingsTable } from '@/components/standings/StandingsTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeTournament } from '@/hooks/useRealtimeTournament'

interface StandingsClientProps {
  tournamentId: string
  tournament: Tournament
  groups: Group[]
  members: TournamentMember[]
  initialStandings: GroupStanding[]
  myMemberId: string | null
}

export function StandingsClient({
  tournamentId,
  tournament,
  groups,
  members,
  initialStandings,
  myMemberId,
}: StandingsClientProps) {
  const { standings: realtimeStandings } = useRealtimeTournament(tournamentId)

  // Merge initial + realtime
  const standings = useMemo(() => {
    if (realtimeStandings.length === 0) return initialStandings
    const map = new Map(initialStandings.map((s) => [s.id, s]))
    for (const s of realtimeStandings) map.set(s.id, s)
    return Array.from(map.values())
  }, [initialStandings, realtimeStandings])

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  )

  // How many advance from each group to winners bracket
  const advancingPerGroup = tournament.enable_winners_bracket
    ? Math.max(1, Math.floor(members.filter((m) => m.role === 'player').length / (groups.length * 2)))
    : 0

  const losersPerGroup = tournament.enable_losers_bracket ? 1 : 0

  if (tournament.status === 'draft') {
    return (
      <EmptyState
        title="Tournament not started yet"
        description="Start the tournament to generate group standings"
      />
    )
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        title="No groups yet"
        description="Groups will appear once the tournament starts"
      />
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupStandings = standings
          .filter((s) => s.group_id === group.id)
          .map((s) => {
            const member = memberMap.get(s.member_id)
            if (!member) return null
            return { ...s, member }
          })
          .filter(Boolean) as (GroupStanding & { member: TournamentMember })[]

        return (
          <StandingsTable
            key={group.id}
            standings={groupStandings}
            groupName={group.name}
            advancingCount={advancingPerGroup}
            losersCount={losersPerGroup}
            highlightMemberId={myMemberId ?? undefined}
          />
        )
      })}
    </div>
  )
}
