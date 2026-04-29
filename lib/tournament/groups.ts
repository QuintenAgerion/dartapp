import type { TournamentMember, GroupMatchInsert } from '@/types/database'

// ─── Player Distribution ──────────────────────────────────────────────────────

/**
 * Distributes players into groups using snake-draft seeding.
 * e.g. 14 players, 4 groups → groups of 4,4,3,3 (seeds distributed A,B,C,D,D,C,B,A...)
 */
export function distributePlayersIntoGroups(
  players: TournamentMember[],
  numGroups: number
): TournamentMember[][] {
  const groups: TournamentMember[][] = Array.from({ length: numGroups }, () => [])

  // Sort by seed ascending (null seeds go to end)
  const sorted = [...players].sort((a, b) => {
    if (a.seed == null && b.seed == null) return 0
    if (a.seed == null) return 1
    if (b.seed == null) return -1
    return a.seed - b.seed
  })

  let direction = 1 // 1 = forward, -1 = backward (snake draft)
  let groupIdx = 0

  for (const player of sorted) {
    groups[groupIdx].push(player)

    // Snake: when hitting end/start, reverse direction
    if (groupIdx + direction >= numGroups || groupIdx + direction < 0) {
      direction *= -1
    } else {
      groupIdx += direction
    }
  }

  return groups
}

// ─── Round-Robin Match Generation ─────────────────────────────────────────────

/**
 * Generates all round-robin matchups for an array of member IDs.
 * Uses the circle method for scheduling rounds.
 * Returns pairs with round assignments.
 */
export function generateRoundRobinPairs(
  memberIds: string[]
): Array<{ homeMemberId: string; awayMemberId: string; round: number }> {
  const n = memberIds.length
  const pairs: Array<{ homeMemberId: string; awayMemberId: string; round: number }> = []

  if (n < 2) return pairs

  // Add a BYE for odd number of players
  const ids = n % 2 === 0 ? [...memberIds] : [...memberIds, 'BYE']
  const numTeams = ids.length
  const rounds = numTeams - 1
  const half = numTeams / 2

  const rotatingIds = ids.slice(1)

  for (let round = 0; round < rounds; round++) {
    const currentIds = [ids[0], ...rotatingIds]

    for (let i = 0; i < half; i++) {
      const home = currentIds[i]
      const away = currentIds[numTeams - 1 - i]

      // Skip BYE matches
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push({
          homeMemberId: home,
          awayMemberId: away,
          round: round + 1,
        })
      }
    }

    // Rotate: last element goes to position 1
    rotatingIds.unshift(rotatingIds.pop()!)
  }

  return pairs
}

// ─── Board Assignment ──────────────────────────────────────────────────────────

/**
 * Assigns board numbers to matches in rotation within each round.
 * Matches within the same round run in parallel across boards.
 */
export function assignMatchesToBoards<T extends { round: number }>(
  matches: T[],
  numBoards: number
): (T & { boardNumber: number })[] {
  const matchesByRound = new Map<number, T[]>()

  for (const match of matches) {
    const existing = matchesByRound.get(match.round) ?? []
    existing.push(match)
    matchesByRound.set(match.round, existing)
  }

  const result: (T & { boardNumber: number })[] = []

  for (const [, roundMatches] of matchesByRound) {
    roundMatches.forEach((match, idx) => {
      result.push({
        ...match,
        boardNumber: (idx % numBoards) + 1,
      })
    })
  }

  return result
}

// ─── Full Group Match Generation ──────────────────────────────────────────────

export interface GroupMatchSpec {
  groupId: string
  tournamentId: string
  homeMemberId: string
  awayMemberId: string
  round: number
  boardNumber: number
  scheduledAt: string | null
}

export function generateGroupMatches(
  groupId: string,
  tournamentId: string,
  memberIds: string[],
  numBoards: number,
  startTime: Date | null,
  avgDurationMinutes: number,
  fixedBoardNumber?: number
): GroupMatchSpec[] {
  const pairs = generateRoundRobinPairs(memberIds)
  const withBoards = fixedBoardNumber !== undefined
    ? pairs.map(m => ({ ...m, boardNumber: fixedBoardNumber }))
    : assignMatchesToBoards(pairs, numBoards)

  // Calculate scheduled times per round
  const roundStartTimes = new Map<number, Date>()
  if (startTime) {
    const maxRound = Math.max(...pairs.map((p) => p.round), 1)
    for (let r = 1; r <= maxRound; r++) {
      const ms = startTime.getTime() + (r - 1) * avgDurationMinutes * 60_000
      roundStartTimes.set(r, new Date(ms))
    }
  }

  return withBoards.map((m) => ({
    groupId,
    tournamentId,
    homeMemberId: m.homeMemberId,
    awayMemberId: m.awayMemberId,
    round: m.round,
    boardNumber: m.boardNumber,
    scheduledAt: roundStartTimes.get(m.round)?.toISOString() ?? null,
  }))
}

export function groupMatchSpecToInsert(spec: GroupMatchSpec): GroupMatchInsert {
  return {
    group_id: spec.groupId,
    tournament_id: spec.tournamentId,
    home_member_id: spec.homeMemberId,
    away_member_id: spec.awayMemberId,
    round: spec.round,
    board_number: spec.boardNumber,
    scheduled_at: spec.scheduledAt,
    status: 'scheduled',
    home_score: 0,
    away_score: 0,
    winner_member_id: null,
    scorer_member_id: null,
  }
}
