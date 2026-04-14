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
    { label: 'Overview', href: `/tournament/${id}` },
    { label: 'Players', href: `/tournament/${id}/players` },
    { label: 'Matches', href: `/tournament/${id}/matches` },
    { label: 'Standings', href: `/tournament/${id}/standings` },
    { label: 'Bracket', href: `/tournament/${id}/bracket` },
    { label: 'Bracket Matches', href: `/tournament/${id}/bracket-matches` },
    { label: 'Settings', href: `/tournament/${id}/settings` },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 bg-surface-2 border border-border hover:border-accent/50 hover:text-accent px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </a>
          <span className="text-neutral-600">/</span>
          <span className="text-sm text-neutral-300 font-medium truncate">{(tournament as Tournament).name}</span>
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
