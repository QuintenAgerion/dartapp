import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { BracketMatchesClient } from './BracketMatchesClient'
import type { Tournament, Bracket, BracketMatch, TournamentMember } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BracketMatchesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const role = await getMyRole(id, user?.id, supabase)

  const { data: members } = await supabase
    .from('tournament_members')
    .select('*')
    .eq('tournament_id', id)

  const { data: brackets } = await supabase
    .from('brackets')
    .select('*')
    .eq('tournament_id', id)

  let bracketMatches: BracketMatch[] = []
  if (brackets && brackets.length > 0) {
    const bracketIds = brackets.map((b) => b.id)
    const { data: matches } = await supabase
      .from('bracket_matches')
      .select('*')
      .in('bracket_id', bracketIds)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })
    bracketMatches = (matches ?? []) as BracketMatch[]
  }

  // Find my member id for score submission check
  const myMemberId = user
    ? ((members ?? []) as TournamentMember[]).find((m) => m.user_id === user.id)?.id ?? null
    : null

  return (
    <BracketMatchesClient
      tournamentId={id}
      tournament={tournament as Tournament}
      brackets={(brackets ?? []) as Bracket[]}
      bracketMatches={bracketMatches}
      members={(members ?? []) as TournamentMember[]}
      role={role}
      myMemberId={myMemberId}
    />
  )
}
