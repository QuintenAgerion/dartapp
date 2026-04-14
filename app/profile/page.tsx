import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'
import type { Tournament } from '@/types/database'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Tournament history
  const { data: memberships } = await supabase
    .from('tournament_members')
    .select('role, tournament_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const tIds = (memberships ?? []).map((m) => m.tournament_id)
  let tournamentRows: Tournament[] = []
  if (tIds.length > 0) {
    const { data } = await supabase.from('tournaments').select('*').in('id', tIds)
    tournamentRows = (data ?? []) as Tournament[]
  }

  const tournaments = tournamentRows.map((t) => ({
    tournament: t,
    role: (memberships ?? []).find((m) => m.tournament_id === t.id)?.role ?? 'player',
  }))

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ''}
      username={profile?.username ?? ''}
      tournaments={tournaments}
    />
  )
}
