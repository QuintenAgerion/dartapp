import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId, ...fields } = body

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('organizer_id, status')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Only the organizer can edit this tournament' }, { status: 403 })
    }

    // Fields always allowed
    const allowed: Record<string, unknown> = {}
    const safeAlways = ['name', 'description', 'start_date', 'num_boards', 'avg_match_duration']
    for (const key of safeAlways) {
      if (key in fields) allowed[key] = fields[key]
    }

    // Structural fields only allowed when draft
    if (tournament.status === 'draft') {
      const draftOnly = [
        'match_format', 'num_groups',
        'enable_winners_bracket', 'enable_losers_bracket',
        'winners_per_group', 'losers_per_group',
      ]
      for (const key of draftOnly) {
        if (key in fields) allowed[key] = fields[key]
      }
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('tournaments')
      .update(allowed as any)
      .eq('id', tournamentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update tournament' },
      { status: 500 }
    )
  }
}
