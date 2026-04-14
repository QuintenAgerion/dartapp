import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitGroupScore } from '@/lib/tournament/scores'
import { getMyRole } from '@/lib/tournament/permissions'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { matchId: string; homeScore: number; awayScore: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { matchId, homeScore, awayScore } = body

  // Fetch match to get tournament_id
  const { data: match } = await supabase
    .from('group_matches')
    .select('tournament_id, home_member_id, away_member_id, status')
    .eq('id', matchId)
    .single()

  if (!match) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 })
  }

  // Check permission
  const role = await getMyRole(match.tournament_id, user.id, supabase)

  const isInvolved =
    await supabase
      .from('tournament_members')
      .select('id')
      .in('id', [match.home_member_id, match.away_member_id])
      .eq('user_id', user.id)
      .then(({ data }) => (data?.length ?? 0) > 0)

  if (role !== 'organizer' && !isInvolved) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  if (match.status === 'completed' && role !== 'organizer') {
    return NextResponse.json({ success: false, error: 'Match already completed' }, { status: 400 })
  }

  const result = await submitGroupScore(matchId, homeScore, awayScore, supabase)
  return NextResponse.json(result)
}
