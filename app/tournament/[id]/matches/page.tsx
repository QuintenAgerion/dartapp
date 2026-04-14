import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { MatchesClient } from './MatchesClient'
import type { Tournament, Group, TournamentMember, GroupMatch } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatchesPage({ params }: PageProps) {
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

  const [{ data: groups }, { data: members }, { data: matches }] = await Promise.all([
    supabase.from('groups').select('*').eq('tournament_id', id).order('order_index'),
    supabase.from('tournament_members').select('*').eq('tournament_id', id),
    supabase.from('group_matches').select('*').eq('tournament_id', id).order('round').order('scheduled_at'),
  ])

  // Get current user's member ID (for permission checks)
  let myMemberId: string | null = null
  if (user) {
    const myMember = (members ?? []).find((m) => m.user_id === user.id)
    myMemberId = myMember?.id ?? null
  }

  return (
    <MatchesClient
      tournamentId={id}
      tournament={tournament as Tournament}
      groups={(groups ?? []) as Group[]}
      members={(members ?? []) as TournamentMember[]}
      initialMatches={(matches ?? []) as GroupMatch[]}
      role={role}
      myMemberId={myMemberId}
    />
  )
}
