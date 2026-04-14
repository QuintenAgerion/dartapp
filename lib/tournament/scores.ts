import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, MatchFormat } from '@/types/database'
import { recalculateGroupStandings } from './standings'
import { advanceBracketWinner } from './brackets'

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ScoreValidation {
  valid: boolean
  error?: string
  winnerId?: string
}

export function validateGroupScore(
  homeScore: number,
  awayScore: number,
  format: MatchFormat,
  homeMemberId: string,
  awayMemberId: string
): ScoreValidation {
  const required = format === 'bo1' ? 1 : format === 'bo3' ? 2 : 3
  const maxLegs = format === 'bo1' ? 1 : format === 'bo3' ? 3 : 5

  if (homeScore < 0 || awayScore < 0) {
    return { valid: false, error: 'Scores cannot be negative' }
  }

  if (homeScore > required && awayScore > required) {
    return { valid: false, error: `Both players cannot exceed ${required} legs` }
  }

  if (homeScore > required) {
    return { valid: false, error: `Home score cannot exceed ${required}` }
  }

  if (awayScore > required) {
    return { valid: false, error: `Away score cannot exceed ${required}` }
  }

  if (homeScore + awayScore > maxLegs) {
    return { valid: false, error: `Total legs cannot exceed ${maxLegs}` }
  }

  if (homeScore !== required && awayScore !== required) {
    return {
      valid: false,
      error: `One player must reach ${required} legs to complete the match`,
    }
  }

  const winnerId = homeScore > awayScore ? homeMemberId : awayMemberId
  return { valid: true, winnerId }
}

// ─── Group Score Submission ───────────────────────────────────────────────────

export async function submitGroupScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
  supabase: SupabaseClient<Database>
): Promise<{ success: boolean; error?: string }> {
  // Fetch match
  const { data: match, error: fetchErr } = await supabase
    .from('group_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchErr || !match) {
    return { success: false, error: 'Match not found' }
  }

  // Fetch tournament for format
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('match_format')
    .eq('id', match.tournament_id)
    .single()

  if (tErr || !tournament) {
    return { success: false, error: 'Tournament not found' }
  }

  const validation = validateGroupScore(
    homeScore,
    awayScore,
    tournament.match_format,
    match.home_member_id,
    match.away_member_id
  )

  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Update match
  const { error: updateErr } = await supabase
    .from('group_matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner_member_id: validation.winnerId,
      status: 'completed',
    })
    .eq('id', matchId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Recalculate standings
  try {
    await recalculateGroupStandings(match.group_id, supabase)
  } catch {
    // Non-fatal — standings will recalculate on next trigger
  }

  return { success: true }
}

// ─── Bracket Score Submission ─────────────────────────────────────────────────

export async function submitBracketScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
  supabase: SupabaseClient<Database>
): Promise<{ success: boolean; error?: string }> {
  const { data: match, error: fetchErr } = await supabase
    .from('bracket_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchErr || !match) {
    return { success: false, error: 'Match not found' }
  }

  if (!match.home_member_id || !match.away_member_id) {
    return { success: false, error: 'Match players not yet determined' }
  }

  // Use match-specific format if set, otherwise fall back to tournament default
  let format: import('@/types/database').MatchFormat
  if (match.match_format) {
    format = match.match_format
  } else {
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('match_format')
      .eq('id', match.tournament_id)
      .single()

    if (tErr || !tournament) {
      return { success: false, error: 'Tournament not found' }
    }
    format = tournament.match_format
  }

  const validation = validateGroupScore(
    homeScore,
    awayScore,
    format,
    match.home_member_id,
    match.away_member_id
  )

  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const newWinnerId = validation.winnerId!
  const newLoserId =
    newWinnerId === match.home_member_id
      ? match.away_member_id
      : match.home_member_id

  const isCorrection = match.status === 'completed' && match.winner_member_id != null
  const oldWinnerId = match.winner_member_id
  const winnerChanged = isCorrection && oldWinnerId !== newWinnerId

  // If correcting and the winner changed, swap players in the next match (if not yet played)
  if (winnerChanged && match.next_match_id) {
    const { data: nextMatch } = await supabase
      .from('bracket_matches')
      .select('home_member_id, away_member_id, status')
      .eq('id', match.next_match_id)
      .single()

    if (nextMatch && nextMatch.status !== 'completed') {
      if (nextMatch.home_member_id === oldWinnerId) {
        await supabase
          .from('bracket_matches')
          .update({ home_member_id: newWinnerId })
          .eq('id', match.next_match_id)
      } else if (nextMatch.away_member_id === oldWinnerId) {
        await supabase
          .from('bracket_matches')
          .update({ away_member_id: newWinnerId })
          .eq('id', match.next_match_id)
      }
    }
  }

  const { error: updateErr } = await supabase
    .from('bracket_matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner_member_id: newWinnerId,
      loser_member_id: newLoserId,
      status: 'completed',
    })
    .eq('id', matchId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Only advance for new submissions; corrections handle advancement above
  if (!isCorrection) {
    try {
      await advanceBracketWinner(matchId, newWinnerId, newLoserId, supabase)
    } catch {
      // Non-fatal
    }
  }

  // If all bracket matches are now done, mark tournament as completed
  const { count: remaining } = await supabase
    .from('bracket_matches')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', match.tournament_id)
    .neq('status', 'completed')

  if (remaining === 0) {
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', match.tournament_id)
  }

  return { success: true }
}
