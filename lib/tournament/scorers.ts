import type { TournamentMember } from '@/types/database'

interface MatchSpec {
  id: string
  homeMemberId: string
  awayMemberId: string
  scheduledAt: string | null
}

interface GroupMatchSpec extends MatchSpec {
  groupId: string
}

/**
 * Assigns a scorer to each match.
 * Rules:
 * 1. Scorer cannot be a player in that match
 * 2. Scorer cannot score two matches at the same time
 * 3. Prefer scorers who don't play within avgDurationMinutes before/after
 * 4. Load balance: prefer scorers with fewer assignments
 */
export function assignScorers(
  matches: MatchSpec[],
  players: TournamentMember[],
  avgDurationMinutes: number
): Map<string, string> {
  const result = new Map<string, string>() // matchId -> scorerMemberId

  // Track which times each player is already scoring
  const scoringTimes = new Map<string, number[]>() // memberId -> [timestamp ms]

  // Build player play times (when each player plays their own matches)
  const playerPlayTimes = new Map<string, number[]>()
  for (const match of matches) {
    if (!match.scheduledAt) continue
    const t = new Date(match.scheduledAt).getTime()
    const home = playerPlayTimes.get(match.homeMemberId) ?? []
    home.push(t)
    playerPlayTimes.set(match.homeMemberId, home)
    const away = playerPlayTimes.get(match.awayMemberId) ?? []
    away.push(t)
    playerPlayTimes.set(match.awayMemberId, away)
  }

  // Sort matches by scheduled time
  const sorted = [...matches].sort((a, b) => {
    if (!a.scheduledAt && !b.scheduledAt) return 0
    if (!a.scheduledAt) return 1
    if (!b.scheduledAt) return -1
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  })

  const durationMs = avgDurationMinutes * 60_000

  for (const match of sorted) {
    const matchTime = match.scheduledAt ? new Date(match.scheduledAt).getTime() : null

    // Step 1: candidates are players not in this match
    let candidates = players.filter(
      (p) => p.id !== match.homeMemberId && p.id !== match.awayMemberId
    )

    // Step 2: exclude players already scoring at this exact time
    if (matchTime !== null) {
      candidates = candidates.filter((p) => {
        const times = scoringTimes.get(p.id) ?? []
        return !times.some((t) => t === matchTime)
      })
    }

    // Fallback: if no candidates available, allow anyone not playing in this match
    if (candidates.length === 0) {
      candidates = players.filter(
        (p) => p.id !== match.homeMemberId && p.id !== match.awayMemberId
      )
    }

    if (candidates.length === 0) continue

    // Step 3: score candidates (lower = better)
    const assignmentCounts = new Map<string, number>()
    for (const v of result.values()) {
      assignmentCounts.set(v, (assignmentCounts.get(v) ?? 0) + 1)
    }

    const scored = candidates.map((p) => {
      let penalty = 0

      if (matchTime !== null) {
        const playTimes = playerPlayTimes.get(p.id) ?? []
        for (const t of playTimes) {
          const diff = Math.abs(t - matchTime)
          if (diff < durationMs) {
            penalty += 3 // Playing during or right next to this scoring slot
          } else if (diff < durationMs * 2) {
            penalty += 1 // Playing somewhat close
          }
        }
      }

      return { player: p, penalty, count: assignmentCounts.get(p.id) ?? 0 }
    })

    // Sort: lowest penalty first, then fewest existing assignments
    scored.sort((a, b) => {
      if (a.penalty !== b.penalty) return a.penalty - b.penalty
      return a.count - b.count
    })

    const chosen = scored[0].player
    result.set(match.id, chosen.id)

    if (matchTime !== null) {
      const times = scoringTimes.get(chosen.id) ?? []
      times.push(matchTime)
      scoringTimes.set(chosen.id, times)
    }
  }

  return result
}

/**
 * Like assignScorers() but restricts candidates to players in the same group.
 * Falls back to any non-playing player when the group has no free members (e.g. group of 2).
 */
export function assignGroupScopedScorers(
  matches: GroupMatchSpec[],
  groupMembersMap: Map<string, Set<string>>,
  allPlayers: TournamentMember[],
  avgDurationMinutes: number
): Map<string, string> {
  const result = new Map<string, string>()
  const scoringTimes = new Map<string, number[]>()

  const playerPlayTimes = new Map<string, number[]>()
  for (const match of matches) {
    if (!match.scheduledAt) continue
    const t = new Date(match.scheduledAt).getTime()
    const home = playerPlayTimes.get(match.homeMemberId) ?? []
    home.push(t)
    playerPlayTimes.set(match.homeMemberId, home)
    const away = playerPlayTimes.get(match.awayMemberId) ?? []
    away.push(t)
    playerPlayTimes.set(match.awayMemberId, away)
  }

  const sorted = [...matches].sort((a, b) => {
    if (!a.scheduledAt && !b.scheduledAt) return 0
    if (!a.scheduledAt) return 1
    if (!b.scheduledAt) return -1
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  })

  const durationMs = avgDurationMinutes * 60_000

  for (const match of sorted) {
    const matchTime = match.scheduledAt ? new Date(match.scheduledAt).getTime() : null
    const groupMembers = groupMembersMap.get(match.groupId)

    // Prefer candidates from the same group; fall back to all players if needed
    let candidates = groupMembers
      ? allPlayers.filter(p =>
          groupMembers.has(p.id) &&
          p.id !== match.homeMemberId &&
          p.id !== match.awayMemberId
        )
      : []

    if (candidates.length === 0) {
      candidates = allPlayers.filter(
        p => p.id !== match.homeMemberId && p.id !== match.awayMemberId
      )
    }

    if (matchTime !== null) {
      candidates = candidates.filter(p => {
        const times = scoringTimes.get(p.id) ?? []
        return !times.some(t => t === matchTime)
      })
    }

    if (candidates.length === 0) {
      candidates = allPlayers.filter(
        p => p.id !== match.homeMemberId && p.id !== match.awayMemberId
      )
    }

    if (candidates.length === 0) continue

    const assignmentCounts = new Map<string, number>()
    for (const v of result.values()) {
      assignmentCounts.set(v, (assignmentCounts.get(v) ?? 0) + 1)
    }

    const scored = candidates.map(p => {
      let penalty = 0
      if (matchTime !== null) {
        const playTimes = playerPlayTimes.get(p.id) ?? []
        for (const t of playTimes) {
          const diff = Math.abs(t - matchTime)
          if (diff < durationMs) penalty += 3
          else if (diff < durationMs * 2) penalty += 1
        }
      }
      return { player: p, penalty, count: assignmentCounts.get(p.id) ?? 0 }
    })

    scored.sort((a, b) => {
      if (a.penalty !== b.penalty) return a.penalty - b.penalty
      return a.count - b.count
    })

    const chosen = scored[0].player
    result.set(match.id, chosen.id)

    if (matchTime !== null) {
      const times = scoringTimes.get(chosen.id) ?? []
      times.push(matchTime)
      scoringTimes.set(chosen.id, times)
    }
  }

  return result
}
