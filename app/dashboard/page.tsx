import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { JoinTournamentForm } from './JoinTournamentForm'
import type { Tournament } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch tournaments where user is organizer
  const { data: ownedTournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch tournaments where user is a member (but not organizer)
  const { data: memberRows } = await supabase
    .from('tournament_members')
    .select('role, tournament_id')
    .eq('user_id', user.id)
    .neq('role', 'organizer')

  const memberTournamentIds = (memberRows ?? []).map((m) => m.tournament_id)
  let joinedTournaments: Tournament[] = []
  if (memberTournamentIds.length > 0) {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .in('id', memberTournamentIds)
      .order('created_at', { ascending: false })
    joinedTournaments = (data ?? []) as Tournament[]
  }

  const joined = joinedTournaments.map((t) => ({
    tournament: t,
    role: (memberRows ?? []).find((m) => m.tournament_id === t.id)?.role ?? 'player',
  }))

  const owned = ownedTournaments ?? []

  return (
    <div className="space-y-10">
      {/* Header met logo */}
      <div className="flex items-center gap-6">
        <img src="/NSVV logo met bier en pijlen.png" alt="NSVV" className="h-28 w-auto shrink-0 hidden sm:block" />
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 font-display uppercase tracking-wide">Mijn Toernooien</h1>
              <p className="text-stone-500 text-sm mt-0.5">Beheer en volg je darttoernooien</p>
            </div>
            <Link href="/tournament/create">
              <Button>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nieuw Toernooi
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Deelnemen met uitnodigingscode */}
      <JoinTournamentForm />

      {/* Eigen toernooien */}
      {owned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">
            Organisator
          </h2>
          <div className="grid gap-3">
            {owned.map((t) => (
              <TournamentCard key={t.id} tournament={t} role="organizer" />
            ))}
          </div>
        </section>
      )}

      {/* Deelnemende toernooien */}
      {joined.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">
            Deelnemer
          </h2>
          <div className="grid gap-3">
            {joined.map(({ tournament, role }) => (
              <TournamentCard key={tournament.id} tournament={tournament} role={role as 'player' | 'viewer'} />
            ))}
          </div>
        </section>
      )}

      {/* Lege staat */}
      {owned.length === 0 && joined.length === 0 && (
        <EmptyState
          title="Nog geen toernooien"
          description="Maak je eerste darttoernooi aan of doe mee via een uitnodigingscode."
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          action={
            <Link href="/tournament/create">
              <Button>Toernooi aanmaken</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
