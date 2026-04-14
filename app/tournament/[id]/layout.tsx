import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TournamentHeader } from '@/components/tournament/TournamentHeader'
import { Tabs } from '@/components/ui/Tabs'
import type { Tournament } from '@/types/database'

interface TournamentLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function TournamentLayout({ children, params }: TournamentLayoutProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  // Get player count
  const { count: playerCount } = await supabase
    .from('tournament_members')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .eq('role', 'player')

  const tabs = [
    { label: 'Overzicht', href: `/tournament/${id}` },
    { label: 'Spelers', href: `/tournament/${id}/players` },
    { label: 'Wedstrijden', href: `/tournament/${id}/matches` },
    { label: 'Standen', href: `/tournament/${id}/standings` },
    { label: 'Bracket', href: `/tournament/${id}/bracket` },
    { label: 'Bracket Wedstrijden', href: `/tournament/${id}/bracket-matches` },
    { label: 'Instellingen', href: `/tournament/${id}/settings` },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <img src="/NSVV logo.png" alt="NSVV" className="h-7 w-auto" />
            <span className="font-display uppercase tracking-widest text-sm font-bold text-stone-900 hidden sm:block">NSVV Dart</span>
          </a>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-700 font-medium truncate">{(tournament as Tournament).name}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-6 mb-2">
          <img src="/NSVV logo met bier en pijlen.png" alt="NSVV" className="h-[120px] w-auto shrink-0" />
          <TournamentHeader
            tournament={tournament as Tournament}
            playerCount={playerCount ?? 0}
          />
        </div>
        <Tabs tabs={tabs} className="mt-6" />
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
