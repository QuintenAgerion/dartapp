import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { InviteLink } from '@/components/tournament/InviteLink'
import { StartTournamentButton } from './StartTournamentButton'
import { GenerateBracketButton } from './GenerateBracketButton'
import { DeleteTournamentButton } from './DeleteTournamentButton'
import type { Tournament } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TournamentOverviewPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const t = tournament as Tournament

  const role = await getMyRole(id, user?.id, supabase)

  // Stats
  const [{ count: playerCount }, { count: matchCount }, { count: completedCount }, { count: bracketCount }] = await Promise.all([
    supabase.from('tournament_members').select('*', { count: 'exact', head: true }).eq('tournament_id', id).eq('role', 'player'),
    supabase.from('group_matches').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
    supabase.from('group_matches').select('*', { count: 'exact', head: true }).eq('tournament_id', id).eq('status', 'completed'),
    supabase.from('brackets').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
  ])
  const hasBracket = (bracketCount ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Spelers" value={playerCount ?? 0} />
        <StatCard label="Poules" value={t.num_groups} />
        <StatCard label="Borden" value={t.num_boards} />
        <StatCard
          label="Gespeelde wedstrijden"
          value={matchCount ? `${completedCount ?? 0}/${matchCount}` : '—'}
        />
      </div>

      {/* Organizer actions */}
      {role === 'organizer' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-stone-900 font-display uppercase tracking-wide">Organisator Tools</h3>

          {t.status === 'draft' && (
            <>
              <InviteLink inviteCode={t.invite_code} />
              <div className="border-t border-border pt-4">
                <p className="text-sm text-stone-500 mb-3">
                  Zodra alle spelers zijn ingeschreven, start je het toernooi om poules en wedstrijden te genereren.
                </p>
                <StartTournamentButton tournamentId={id} playerCount={playerCount ?? 0} />
              </div>
            </>
          )}

          {t.status === 'active' && (
            <>
              <InviteLink inviteCode={t.invite_code} />
              {t.enable_winners_bracket && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-stone-500 mb-3">
                    Zodra de pouleronde klaar is, genereer je de knockoutbracket.
                  </p>
                  <GenerateBracketButton
                    tournamentId={id}
                    hasBracket={hasBracket}
                    tournamentFormat={t.match_format}
                    winnersPerGroup={t.winners_per_group}
                    losersPerGroup={t.losers_per_group}
                    numGroups={t.num_groups}
                    enableLosers={t.enable_losers_bracket}
                  />
                </div>
              )}
            </>
          )}

          {t.status === 'completed' && (
            <p className="text-sm text-stone-500">Dit toernooi is afgelopen.</p>
          )}

          <div className="border-t border-border pt-4">
            <DeleteTournamentButton tournamentId={id} tournamentName={t.name} />
          </div>
        </div>
      )}

      {/* Info card for non-organizers in draft */}
      {role !== 'organizer' && t.status === 'draft' && (
        <div className="card text-center py-8">
          <p className="text-stone-500">Wachten tot de organisator het toernooi start...</p>
        </div>
      )}

      {/* Match format info */}
      <div className="card">
        <h3 className="font-semibold text-stone-900 font-display uppercase tracking-wide mb-3">Toernooigegevens</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Wedstrijdformaat</dt>
            <dd className="text-stone-800 font-medium">
              {t.match_format === 'bo1' ? 'Best of 1' : t.match_format === 'bo3' ? 'Best of 3' : 'Best of 5'}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Gem. wedstrijdduur</dt>
            <dd className="text-stone-800 font-medium">{t.avg_match_duration} min</dd>
          </div>
          <div>
            <dt className="text-stone-500">Winnaarsbracket</dt>
            <dd className="text-stone-800 font-medium">{t.enable_winners_bracket ? 'Ja' : 'Nee'}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Verlizersbracket</dt>
            <dd className="text-stone-800 font-medium">{t.enable_losers_bracket ? 'Ja' : 'Nee'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </div>
  )
}
