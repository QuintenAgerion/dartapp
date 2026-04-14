'use client'

import { useCallback, useMemo } from 'react'
import type { Tournament, Group, TournamentMember, GroupStanding, GroupMatch } from '@/types/database'
import { StandingsTable } from '@/components/standings/StandingsTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeTournament } from '@/hooks/useRealtimeTournament'
import { createClient } from '@/lib/supabase/client'

interface StandingsClientProps {
  tournamentId: string
  tournament: Tournament
  groups: Group[]
  members: TournamentMember[]
  initialStandings: GroupStanding[]
  initialMatches: GroupMatch[]
  myMemberId: string | null
  isOrganizer: boolean
  avatarMap: Record<string, string>
}

type StandingsRow = GroupStanding & { member: TournamentMember }

function sortWithTiebreakers(rows: StandingsRow[], matches: GroupMatch[]): StandingsRow[] {
  return [...rows].sort((a, b) => {
    // 1. Points (desc)
    if (b.points !== a.points) return b.points - a.points

    // 2. Head-to-head: find the direct match between a and b
    const h2h = matches.find(
      (m) =>
        m.status === 'completed' &&
        ((m.home_member_id === a.member_id && m.away_member_id === b.member_id) ||
          (m.home_member_id === b.member_id && m.away_member_id === a.member_id))
    )

    if (h2h) {
      const aIsHome = h2h.home_member_id === a.member_id
      const aWon = h2h.winner_member_id === a.member_id
      const bWon = h2h.winner_member_id === b.member_id

      // H2H wins
      if (aWon && !bWon) return -1
      if (bWon && !aWon) return 1

      // H2H leg difference
      const aLegs = aIsHome ? h2h.home_score - h2h.away_score : h2h.away_score - h2h.home_score
      const bLegs = -aLegs
      if (aLegs !== bLegs) return bLegs - aLegs
    }

    // 3. Overall leg difference (desc)
    if (b.leg_difference !== a.leg_difference) return b.leg_difference - a.leg_difference

    // 4. Overall legs for (desc)
    if (b.legs_for !== a.legs_for) return b.legs_for - a.legs_for

    // 5. Manual position as final fallback
    return a.position - b.position
  })
}

export function StandingsClient({
  tournamentId,
  tournament,
  groups,
  members,
  initialStandings,
  initialMatches,
  myMemberId,
  isOrganizer,
  avatarMap,
}: StandingsClientProps) {
  const { standings: realtimeStandings } = useRealtimeTournament(tournamentId)

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

  const advancingPerGroup = tournament.enable_winners_bracket ? tournament.winners_per_group : 0
  const losersPerGroup = tournament.enable_losers_bracket ? tournament.losers_per_group : 0

  const handleSwap = useCallback(async (groupId: string, sortedRows: StandingsRow[], idxA: number, idxB: number) => {
    const newOrder = [...sortedRows]
    ;[newOrder[idxA], newOrder[idxB]] = [newOrder[idxB], newOrder[idxA]]

    // Re-assign distinct positions based on new order
    const updates = newOrder.map((row, i) => ({ id: row.id, position: i + 1 }))

    const supabase = createClient()
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from('group_standings').update({ position }).eq('id', id)
      )
    )
  }, [])

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
        const groupRows = standings
          .filter((s) => s.group_id === group.id)
          .map((s) => {
            const member = memberMap.get(s.member_id)
            if (!member) return null
            return { ...s, member }
          })
          .filter(Boolean) as StandingsRow[]

        const groupMatches = initialMatches.filter((m) => m.group_id === group.id)
        const allMatchesPlayed = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'completed')
        const completedMatches = groupMatches.filter((m) => m.status === 'completed')
        const sorted = sortWithTiebreakers(groupRows, completedMatches)

        return (
          <StandingsTable
            key={group.id}
            standings={sorted}
            groupName={group.name}
            advancingCount={advancingPerGroup}
            losersCount={losersPerGroup}
            highlightMemberId={myMemberId ?? undefined}
            isOrganizer={isOrganizer}
            allMatchesPlayed={allMatchesPlayed}
            onSwap={(idxA, idxB) => handleSwap(group.id, sorted, idxA, idxB)}
            avatarMap={avatarMap}
          />
        )
      })}
    </div>
  )
}
