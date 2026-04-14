import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinTournamentClient } from './JoinTournamentClient'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params
  const supabase = await createClient()

  // Find tournament by invite code
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('id, name, status, num_groups')
    .eq('invite_code', code)
    .single()

  if (error || !tournament) notFound()

  if (tournament.status === 'completed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card max-w-sm text-center">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Tournament Ended</h2>
          <p className="text-sm text-stone-500">This tournament has already been completed.</p>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to register with redirect param
  if (!user) {
    redirect(`/register?redirect=/join/${code}`)
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('tournament_members')
    .select('id, role')
    .eq('tournament_id', tournament.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Already joined — redirect to tournament
    redirect(`/tournament/${tournament.id}`)
  }

  // Get user profile for display name
  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  return (
    <JoinTournamentClient
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      inviteCode={code}
      defaultName={profile?.username ?? ''}
      userId={user.id}
    />
  )
}
