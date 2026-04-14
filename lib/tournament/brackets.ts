import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, BracketMatchInsert, GroupStanding, TournamentMember } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function numRounds(n: number): number {
  return Math.log2(nextPowerOfTwo(n))
}

// ─── Winners Bracket Generation ───────────────────────────────────────────────

export interface BracketMatchSpec {
  round: number
  matchNumber: number
  homeMemberId: string | null
  awayMemberId: string | null
  isBye: boolean
}

/**
 * Generates a single-elimination bracket structure.
 * Returns match specs in round order — callers must insert and then
 * back-fill next_match_id links.
 */
export function generateSingleEliminationMatches(
  qualifiers: TournamentMember[]
): BracketMatchSpec[] {
  const n = qualifiers.length
  if (n < 2) return []

  const size = nextPowerOfTwo(n)
  const rounds = numRounds(size)
  const byeCount = size - n

  // Seed players: top seeds get byes
  // Slots: [seed1, seed16, seed8, seed9, seed5, seed12, seed4, seed13, ...] (standard bracket)
  const seeded = [...qualifiers].sort((a, b) => {
    if (a.seed == null && b.seed == null) return 0
    if (a.seed == null) return 1
    if (b.seed == null) return -1
    return a.seed - b.seed
  })

  // Fill to power-of-2 with nulls (byes)
  const slots: (TournamentMember | null)[] = [
    ...seeded,
    ...Array(byeCount).fill(null),
  ]

  const specs: BracketMatchSpec[] = []

  // Round 1: pair up slots
  const matchesInFirstRound = size / 2
  for (let i = 0; i < matchesInFirstRound; i++) {
    const home = slots[i * 2] ?? null
    const away = slots[i * 2 + 1] ?? null
    const isBye = home !== null && away === null

    specs.push({
      round: 1,
      matchNumber: i + 1,
      homeMemberId: home?.id ?? null,
      awayMemberId: away?.id ?? null,
      isBye,
    })
  }

  // Subsequent rounds: empty slots for advancement
  let matchesInRound = matchesInFirstRound / 2
  for (let r = 2; r <= rounds; r++) {
    for (let m = 1; m <= matchesInRound; m++) {
      specs.push({
        round: r,
        matchNumber: m,
        homeMemberId: null,
        awayMemberId: null,
        isBye: false,
      })
    }
    matchesInRound /= 2
  }

  return specs
}

/**
 * Inserts bracket and all match rows, then links next_match_id relationships.
 * Returns the created bracket ID.
 */
export async function createWinnersBracket(
  tournamentId: string,
  qualifiers: TournamentMember[],
  supabase: SupabaseClient<Database>
): Promise<string> {
  // Insert bracket
  const { data: bracket, error: bErr } = await supabase
    .from('brackets')
    .insert({ tournament_id: tournamentId, type: 'winners' })
    .select()
    .single()

  if (bErr || !bracket) throw bErr ?? new Error('Failed to create bracket')

  const specs = generateSingleEliminationMatches(qualifiers)

  // Insert all matches (match_format applied separately via UPDATE after creation)
  const inserts: BracketMatchInsert[] = specs.map((s) => ({
    bracket_id: bracket.id,
    tournament_id: tournamentId,
    round: s.round,
    match_number: s.matchNumber,
    home_member_id: s.homeMemberId,
    away_member_id: s.awayMemberId,
    status: s.isBye ? 'completed' : s.homeMemberId && s.awayMemberId ? 'scheduled' : 'pending',
    home_score: 0,
    away_score: 0,
    winner_member_id: s.isBye ? s.homeMemberId : null,
    loser_member_id: null,
    next_match_id: null,
    loser_next_match_id: null,
    board_number: null,
    scheduled_at: null,
  }))

  const { data: insertedMatches, error: mErr } = await supabase
    .from('bracket_matches')
    .insert(inserts)
    .select()

  if (mErr || !insertedMatches) throw mErr ?? new Error('Failed to insert bracket matches')

  // Build round/matchNumber → id lookup
  const idLookup = new Map<string, string>()
  for (const m of insertedMatches) {
    idLookup.set(`${m.round}-${m.match_number}`, m.id)
  }

  // Link next_match_id: winner of match (r,m) goes to (r+1, ceil(m/2))
  const maxRound = Math.max(...insertedMatches.map((m) => m.round))

  for (const match of insertedMatches) {
    if (match.round >= maxRound) continue

    const nextMatchNumber = Math.ceil(match.match_number / 2)
    const nextId = idLookup.get(`${match.round + 1}-${nextMatchNumber}`)

    if (nextId) {
      await supabase
        .from('bracket_matches')
        .update({ next_match_id: nextId })
        .eq('id', match.id)
    }
  }

  // Auto-advance byes in round 1
  for (const match of insertedMatches.filter((m) => m.round === 1)) {
    if (match.winner_member_id) {
      await advanceBracketWinner(match.id, match.winner_member_id, null, supabase)
    }
  }

  return bracket.id
}

// ─── Losers Bracket Generation ─────────────────────────────────────────────────

/**
 * Creates a losers/consolation bracket for players who didn't qualify for the
 * winners bracket (e.g. 3rd/4th place from each group).
 * Uses the same single-elimination logic as the winners bracket.
 */
export async function createLosersBracket(
  tournamentId: string,
  qualifiers: TournamentMember[],
  supabase: SupabaseClient<Database>
): Promise<string> {
  const { data: bracket, error: bErr } = await supabase
    .from('brackets')
    .insert({ tournament_id: tournamentId, type: 'losers' })
    .select()
    .single()

  if (bErr || !bracket) throw bErr ?? new Error('Failed to create losers bracket')

  const specs = generateSingleEliminationMatches(qualifiers)

  const inserts: BracketMatchInsert[] = specs.map((s) => ({
    bracket_id: bracket.id,
    tournament_id: tournamentId,
    round: s.round,
    match_number: s.matchNumber,
    home_member_id: s.homeMemberId,
    away_member_id: s.awayMemberId,
    status: s.isBye ? 'completed' : s.homeMemberId && s.awayMemberId ? 'scheduled' : 'pending',
    home_score: 0,
    away_score: 0,
    winner_member_id: s.isBye ? s.homeMemberId : null,
    loser_member_id: null,
    next_match_id: null,
    loser_next_match_id: null,
    board_number: null,
    scheduled_at: null,
  }))

  const { data: insertedMatches, error: mErr } = await supabase
    .from('bracket_matches')
    .insert(inserts)
    .select()

  if (mErr || !insertedMatches) throw mErr ?? new Error('Failed to insert losers bracket matches')

  // Build round/matchNumber → id lookup and link next_match_id
  const idLookup = new Map<string, string>()
  for (const m of insertedMatches) {
    idLookup.set(`${m.round}-${m.match_number}`, m.id)
  }

  const maxRound = Math.max(...insertedMatches.map((m) => m.round))
  for (const match of insertedMatches) {
    if (match.round >= maxRound) continue
    const nextMatchNumber = Math.ceil(match.match_number / 2)
    const nextId = idLookup.get(`${match.round + 1}-${nextMatchNumber}`)
    if (nextId) {
      await supabase
        .from('bracket_matches')
        .update({ next_match_id: nextId })
        .eq('id', match.id)
    }
  }

  // Auto-advance byes in round 1
  for (const match of insertedMatches.filter((m) => m.round === 1)) {
    if (match.winner_member_id) {
      await advanceBracketWinner(match.id, match.winner_member_id, null, supabase)
    }
  }

  return bracket.id
}

// ─── Advancement ──────────────────────────────────────────────────────────────

/**
 * Moves winner/loser into their respective next matches.
 */
export async function advanceBracketWinner(
  matchId: string,
  winnerId: string,
  loserId: string | null,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: match, error } = await supabase
    .from('bracket_matches')
    .select('next_match_id, loser_next_match_id, match_number')
    .eq('id', matchId)
    .single()

  if (error || !match) return

  // Advance winner
  if (match.next_match_id) {
    const { data: nextMatch } = await supabase
      .from('bracket_matches')
      .select('home_member_id, away_member_id')
      .eq('id', match.next_match_id)
      .single()

    if (nextMatch) {
      const isHomeSlot = !nextMatch.home_member_id

      await supabase
        .from('bracket_matches')
        .update(
          isHomeSlot
            ? { home_member_id: winnerId, status: nextMatch.away_member_id ? 'scheduled' : 'pending' }
            : { away_member_id: winnerId, status: nextMatch.home_member_id ? 'scheduled' : 'pending' }
        )
        .eq('id', match.next_match_id)
    }
  }

  // Advance loser to losers bracket
  if (match.loser_next_match_id && loserId) {
    const { data: loserMatch } = await supabase
      .from('bracket_matches')
      .select('home_member_id, away_member_id')
      .eq('id', match.loser_next_match_id)
      .single()

    if (loserMatch) {
      const isHomeSlot = !loserMatch.home_member_id

      await supabase
        .from('bracket_matches')
        .update(
          isHomeSlot
            ? { home_member_id: loserId, status: loserMatch.away_member_id ? 'scheduled' : 'pending' }
            : { away_member_id: loserId, status: loserMatch.home_member_id ? 'scheduled' : 'pending' }
        )
        .eq('id', match.loser_next_match_id)
    }
  }
}

// ─── Qualifier Selection ──────────────────────────────────────────────────────

/**
 * Returns members who qualify for the winners/losers bracket based on standings.
 * @param advancingPerGroup - how many top players per group advance to winners
 * @param losersPerGroup - how many next players go to losers bracket
 */
export function selectQualifiers(
  standingsByGroup: Map<string, (GroupStanding & { member: TournamentMember })[]>,
  advancingPerGroup: number,
  losersPerGroup: number
): { winners: TournamentMember[]; losers: TournamentMember[] } {
  const winners: TournamentMember[] = []
  const losers: TournamentMember[] = []

  for (const [, standings] of standingsByGroup) {
    const sorted = [...standings].sort((a, b) => a.position - b.position)

    for (let i = 0; i < sorted.length; i++) {
      if (i < advancingPerGroup) {
        winners.push(sorted[i].member)
      } else if (i < advancingPerGroup + losersPerGroup) {
        losers.push(sorted[i].member)
      }
    }
  }

  return { winners, losers }
}
