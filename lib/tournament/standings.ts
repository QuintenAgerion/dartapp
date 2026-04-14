import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, GroupMatch, GroupStandingWithMember } from '@/types/database'

// ─── Standings Calculation ────────────────────────────────────────────────────

interface StandingData {
  memberId: string
  played: number
  wins: number
  losses: number
  legsFor: number
  legsAgainst: number
}

export function calculateStandingsFromMatches(
  completedMatches: GroupMatch[],
  memberIds: string[]
): StandingData[] {
  const map = new Map<string, StandingData>()

  for (const id of memberIds) {
    map.set(id, {
      memberId: id,
      played: 0,
      wins: 0,
      losses: 0,
      legsFor: 0,
      legsAgainst: 0,
    })
  }

  for (const match of completedMatches) {
    if (match.status !== 'completed') continue

    const home = map.get(match.home_member_id)
    const away = map.get(match.away_member_id)

    if (home) {
      home.played++
      home.legsFor += match.home_score
      home.legsAgainst += match.away_score
      if (match.winner_member_id === match.home_member_id) home.wins++
      else home.losses++
    }

    if (away) {
      away.played++
      away.legsFor += match.away_score
      away.legsAgainst += match.home_score
      if (match.winner_member_id === match.away_member_id) away.wins++
      else away.losses++
    }
  }

  return Array.from(map.values())
}

// ─── Tiebreaker Sorting ───────────────────────────────────────────────────────

export function sortStandings(
  standings: StandingData[],
  completedMatches: GroupMatch[]
): StandingData[] {
  return [...standings].sort((a, b) => {
    const aPoints = a.wins * 2
    const bPoints = b.wins * 2

    // 1. Points descending
    if (bPoints !== aPoints) return bPoints - aPoints

    // 2. Leg difference descending
    const aDiff = a.legsFor - a.legsAgainst
    const bDiff = b.legsFor - b.legsAgainst
    if (bDiff !== aDiff) return bDiff - aDiff

    // 3. Head-to-head
    const h2h = getHeadToHeadResult(a.memberId, b.memberId, completedMatches)
    if (h2h !== 0) return h2h

    // 4. Legs for (more is better)
    return b.legsFor - a.legsFor
  })
}

function getHeadToHeadResult(
  memberA: string,
  memberB: string,
  matches: GroupMatch[]
): number {
  const h2hMatches = matches.filter(
    (m) =>
      m.status === 'completed' &&
      ((m.home_member_id === memberA && m.away_member_id === memberB) ||
        (m.home_member_id === memberB && m.away_member_id === memberA))
  )

  let aWins = 0
  let bWins = 0

  for (const m of h2hMatches) {
    if (m.winner_member_id === memberA) aWins++
    else if (m.winner_member_id === memberB) bWins++
  }

  if (aWins > bWins) return -1
  if (bWins > aWins) return 1
  return 0
}

// ─── DB Recalculation ─────────────────────────────────────────────────────────

export async function recalculateGroupStandings(
  groupId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  // Fetch all completed matches in the group
  const { data: matches, error: matchErr } = await supabase
    .from('group_matches')
    .select('*')
    .eq('group_id', groupId)

  if (matchErr) throw matchErr

  // Fetch all group members
  const { data: groupMembers, error: gmErr } = await supabase
    .from('group_members')
    .select('member_id')
    .eq('group_id', groupId)

  if (gmErr) throw gmErr

  const memberIds = groupMembers.map((gm) => gm.member_id)
  const standing = calculateStandingsFromMatches(matches ?? [], memberIds)
  const sorted = sortStandings(standing, matches ?? [])

  // Upsert standings
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    const { error } = await supabase
      .from('group_standings')
      .upsert(
        {
          group_id: groupId,
          member_id: s.memberId,
          played: s.played,
          wins: s.wins,
          losses: s.losses,
          legs_for: s.legsFor,
          legs_against: s.legsAgainst,
          position: i + 1,
        },
        { onConflict: 'group_id,member_id' }
      )

    if (error) throw error
  }
}
