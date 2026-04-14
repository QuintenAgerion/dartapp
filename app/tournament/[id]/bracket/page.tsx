import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { BracketClient } from './BracketClient'
import type { Tournament, Bracket, BracketMatch, TournamentMember } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BracketPage({ params }: PageProps) {
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

  const [{ data: brackets }, { data: members }] = await Promise.all([
    supabase.from('brackets').select('*').eq('tournament_id', id),
    supabase.from('tournament_members').select('*').eq('tournament_id', id),
  ])

  const bracketIds = (brackets ?? []).map((b) => b.id)
  const { data: bracketMatches } = bracketIds.length
    ? await supabase
        .from('bracket_matches')
        .select('*')
        .in('bracket_id', bracketIds)
        .order('round')
        .order('match_number')
    : { data: [] }

  return (
    <BracketClient
      tournamentId={id}
      tournament={tournament as Tournament}
      brackets={(brackets ?? []) as Bracket[]}
      bracketMatches={(bracketMatches ?? []) as BracketMatch[]}
      members={(members ?? []) as TournamentMember[]}
      role={role}
    />
  )
}
