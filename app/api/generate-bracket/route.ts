import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { selectQualifiers, advanceBracketWinner } from '@/lib/tournament/brackets'
import { scheduleMatches } from '@/lib/tournament/scheduling'
import { assignScorers } from '@/lib/tournament/scorers'
import type { GroupStanding, TournamentMember } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { tournamentId, formatOverrides } = await request.json()
    // formatOverrides: { winners: { [fromEnd]: MatchFormat }, losers: { [fromEnd]: MatchFormat } }
    const winnersOverrides: Record<string, string> = formatOverrides?.winners ?? {}
    const losersOverrides: Record<string, string> = formatOverrides?.losers ?? {}

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const role = await getMyRole(tournamentId, user?.id, supabase)
    if (role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can generate brackets' }, { status: 403 })
    }

    // Fetch tournament
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (tErr || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (!tournament.enable_winners_bracket) {
      return NextResponse.json({ error: 'Winners bracket is not enabled for this tournament' }, { status: 400 })
    }

    // Brackets must already exist (pre-generated at tournament start)
    const { data: allBrackets } = await supabase
      .from('brackets')
      .select('id, type')
      .eq('tournament_id', tournamentId)

    if (!allBrackets || allBrackets.length === 0) {
      return NextResponse.json({ error: 'Bracket structure not found — start the tournament first' }, { status: 400 })
    }

    // Check if already filled in
    const { data: alreadyFilled } = await supabase
      .from('bracket_matches')
      .select('id')
      .in('bracket_id', allBrackets.map((b) => b.id))
      .eq('round', 1)
      .not('home_member_id', 'is', null)
      .limit(1)

    if (alreadyFilled && alreadyFilled.length > 0) {
      return NextResponse.json({ error: 'Brackets have already been filled in' }, { status: 400 })
    }

    // Fetch groups
    const { data: groups, error: gErr } = await supabase
      .from('groups')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('order_index', { ascending: true })

    if (gErr || !groups || groups.length === 0) {
      return NextResponse.json({ error: 'No groups found — start the tournament first' }, { status: 400 })
    }

    // Fetch all group standings
    const { data: allStandings, error: sErr } = await supabase
      .from('group_standings')
      .select('*')
      .in('group_id', groups.map((g) => g.id))

    if (sErr || !allStandings) {
      return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
    }

    // Fetch all relevant members
    const memberIds = [...new Set(allStandings.map((s) => s.member_id))]
    const { data: allMembers, error: mErr } = await supabase
      .from('tournament_members')
      .select('*')
      .in('id', memberIds)

    if (mErr || !allMembers) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    const memberMap = new Map<string, TournamentMember>(allMembers.map((m) => [m.id, m]))

    // Build standingsByGroup map
    const standingsByGroup = new Map<string, (GroupStanding & { member: TournamentMember })[]>()
    for (const group of groups) {
      const groupStandings = (allStandings as GroupStanding[])
        .filter((s) => s.group_id === group.id)
        .map((s) => {
          const member = memberMap.get(s.member_id)
          if (!member) return null
          return { ...s, member }
        })
        .filter((s): s is GroupStanding & { member: TournamentMember } => s !== null)
        .sort((a, b) => a.position - b.position)

      standingsByGroup.set(group.id, groupStandings)
    }

    // Validate enough qualifiers
    const winnersPerGroup = tournament.winners_per_group ?? 2
    const losersPerGroup = tournament.losers_per_group ?? 0
    const { winners } = selectQualifiers(standingsByGroup, winnersPerGroup, losersPerGroup)

    if (winners.length < 2) {
      return NextResponse.json({ error: 'Not enough qualifiers to generate a bracket (need at least 2)' }, { status: 400 })
    }

    // Fill in member IDs for each bracket from standings
    for (const bracket of allBrackets) {
      const { data: r1Matches } = await supabase
        .from('bracket_matches')
        .select('id, home_source_group_idx, home_source_position, away_source_group_idx, away_source_position')
        .eq('bracket_id', bracket.id)
        .eq('round', 1)
        .not('home_source_group_idx', 'is', null)

      for (const match of (r1Matches ?? [])) {
        const homeGroup = groups.find((g) => g.order_index === match.home_source_group_idx)
        const awayGroup = match.away_source_group_idx !== null
          ? groups.find((g) => g.order_index === match.away_source_group_idx)
          : null

        const homeStandings = homeGroup ? standingsByGroup.get(homeGroup.id) ?? [] : []
        const awayStandings = awayGroup ? standingsByGroup.get(awayGroup.id) ?? [] : []

        const homeMember = homeStandings.find((s) => s.position === match.home_source_position)?.member ?? null
        const awayMember = awayStandings.find((s) => s.position === match.away_source_position)?.member ?? null

        if (!homeMember && !awayMember) continue

        const isBye = homeMember !== null && awayMember === null

        await supabase
          .from('bracket_matches')
          .update({
            home_member_id: homeMember?.id ?? null,
            away_member_id: awayMember?.id ?? null,
            status: isBye ? 'completed' : homeMember && awayMember ? 'scheduled' : 'pending',
            winner_member_id: isBye ? homeMember!.id : null,
          })
          .eq('id', match.id)

        if (isBye && homeMember) {
          await advanceBracketWinner(match.id, homeMember.id, null, supabase)
        }
      }
    }

    // Determine bracket match start time: after the last scheduled group match
    const { data: lastGroupMatch } = await supabase
      .from('group_matches')
      .select('scheduled_at')
      .eq('tournament_id', tournamentId)
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single()

    const bracketStartTime = lastGroupMatch?.scheduled_at
      ? new Date(new Date(lastGroupMatch.scheduled_at).getTime() + tournament.avg_match_duration * 60_000)
      : null

    // Schedule ALL bracket matches across boards and apply format overrides
    const { data: allBracketMatches } = await supabase
      .from('bracket_matches')
      .select('id, round, bracket_id, home_member_id, away_member_id')
      .eq('tournament_id', tournamentId)
      .neq('status', 'completed')
      .order('round', { ascending: true })

    if (allBracketMatches && allBracketMatches.length > 0) {
      const scheduled = scheduleMatches(
        allBracketMatches,
        tournament.num_boards,
        tournament.avg_match_duration,
        bracketStartTime
      )

      const bracketTypeMap = new Map<string, string>(
        allBrackets.map((b) => [b.id, b.type])
      )

      // Per-bracket max round (for fromEnd calculation)
      const maxRoundByBracket = new Map<string, number>()
      for (const m of allBracketMatches) {
        const cur = maxRoundByBracket.get(m.bracket_id) ?? 0
        if (m.round > cur) maxRoundByBracket.set(m.bracket_id, m.round)
      }

      // Build scorer map if use_scorers is enabled
      let bracketScorerMap = new Map<string, string>()
      if (tournament.use_scorers) {
        const scorerSpecs = scheduled
          .map((s) => {
            const fullMatch = allBracketMatches.find((m) => m.id === s.id)
            return {
              id: s.id,
              homeMemberId: (fullMatch as any)?.home_member_id ?? '',
              awayMemberId: (fullMatch as any)?.away_member_id ?? '',
              scheduledAt: s.scheduledAt,
            }
          })
          .filter((s) => s.homeMemberId && s.awayMemberId)

        bracketScorerMap = assignScorers(scorerSpecs, allMembers, tournament.avg_match_duration)
      }

      for (const s of scheduled) {
        const updatePayload: Record<string, unknown> = {
          board_number: s.boardNumber,
          scheduled_at: s.scheduledAt,
        }

        if (tournament.use_scorers) {
          updatePayload.scorer_member_id = bracketScorerMap.get(s.id) ?? null
        }

        await supabase
          .from('bracket_matches')
          .update(updatePayload as any)
          .eq('id', s.id)

        const bracketType = bracketTypeMap.get(s.bracket_id) ?? 'winners'
        const maxRound = maxRoundByBracket.get(s.bracket_id) ?? s.round
        const fromEnd = maxRound - s.round
        const overrides = bracketType === 'losers' ? losersOverrides : winnersOverrides
        const matchFormat = overrides[String(fromEnd)] ?? null

        if (matchFormat) {
          await supabase
            .from('bracket_matches')
            .update({ match_format: matchFormat } as any)
            .eq('id', s.id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('generate-bracket error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate bracket' },
      { status: 500 }
    )
  }
}
