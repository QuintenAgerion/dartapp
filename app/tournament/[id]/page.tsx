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
        <StatCard label="Players" value={playerCount ?? 0} />
        <StatCard label="Groups" value={t.num_groups} />
        <StatCard label="Boards" value={t.num_boards} />
        <StatCard
          label="Matches played"
          value={matchCount ? `${completedCount ?? 0}/${matchCount}` : '—'}
        />
      </div>

      {/* Organizer actions */}
      {role === 'organizer' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-200">Organizer Tools</h3>

          {t.status === 'draft' && (
            <>
              <InviteLink inviteCode={t.invite_code} />
              <div className="border-t border-border pt-4">
                <p className="text-sm text-slate-400 mb-3">
                  When all players have joined, start the tournament to generate groups and matches.
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
                  <p className="text-sm text-slate-400 mb-3">
                    When the group stage is done, generate the knockout bracket.
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
            <p className="text-sm text-slate-400">This tournament has been completed.</p>
          )}

          <div className="border-t border-border pt-4">
            <DeleteTournamentButton tournamentId={id} tournamentName={t.name} />
          </div>
        </div>
      )}

      {/* Info card for non-organizers in draft */}
      {role !== 'organizer' && t.status === 'draft' && (
        <div className="card text-center py-8">
          <p className="text-slate-400">Waiting for the organizer to start the tournament...</p>
        </div>
      )}

      {/* Match format info */}
      <div className="card">
        <h3 className="font-semibold text-slate-200 mb-3">Tournament Details</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Match format</dt>
            <dd className="text-slate-200 font-medium">
              {t.match_format === 'bo1' ? 'Best of 1' : t.match_format === 'bo3' ? 'Best of 3' : 'Best of 5'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Avg. match duration</dt>
            <dd className="text-slate-200 font-medium">{t.avg_match_duration} min</dd>
          </div>
          <div>
            <dt className="text-slate-500">Winners bracket</dt>
            <dd className="text-slate-200 font-medium">{t.enable_winners_bracket ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Losers bracket</dt>
            <dd className="text-slate-200 font-medium">{t.enable_losers_bracket ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
