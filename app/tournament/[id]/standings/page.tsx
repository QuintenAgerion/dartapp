import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StandingsClient } from './StandingsClient'
import type { Tournament, Group, TournamentMember, GroupStanding, GroupMatch } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StandingsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const [{ data: groups }, { data: members }] = await Promise.all([
    supabase.from('groups').select('*').eq('tournament_id', id).order('order_index'),
    supabase.from('tournament_members').select('*').eq('tournament_id', id),
  ])

  const groupIds = (groups ?? []).map((g) => g.id)

  const [{ data: standings }, { data: matches }] = await Promise.all([
    groupIds.length
      ? supabase.from('group_standings').select('*').in('group_id', groupIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from('group_matches').select('*').in('group_id', groupIds)
      : Promise.resolve({ data: [] }),
  ])

  let myMemberId: string | null = null
  if (user) {
    const myMember = (members ?? []).find((m) => m.user_id === user.id)
    myMemberId = myMember?.id ?? null
  }

  const isOrganizer = user?.id === (tournament as Tournament).organizer_id

  return (
    <StandingsClient
      tournamentId={id}
      tournament={tournament as Tournament}
      groups={(groups ?? []) as Group[]}
      members={(members ?? []) as TournamentMember[]}
      initialStandings={(standings ?? []) as GroupStanding[]}
      initialMatches={(matches ?? []) as GroupMatch[]}
      myMemberId={myMemberId}
      isOrganizer={isOrganizer}
    />
  )
}
