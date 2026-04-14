import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, MemberRole } from '@/types/database'

export type UserRole = MemberRole | 'viewer'

export async function getMyRole(
  tournamentId: string,
  userId: string | undefined,
  supabase: SupabaseClient<Database>
): Promise<UserRole> {
  if (!userId) return 'viewer'

  // Check if organizer
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('organizer_id')
    .eq('id', tournamentId)
    .single()

  if (tournament?.organizer_id === userId) return 'organizer'

  // Check membership
  const { data: member } = await supabase
    .from('tournament_members')
    .select('role')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single()

  return (member?.role as MemberRole) ?? 'viewer'
}

export function canEditScores(role: UserRole): boolean {
  return role === 'organizer' || role === 'player'
}

export function canManagePlayers(role: UserRole): boolean {
  return role === 'organizer'
}

export function canStartTournament(role: UserRole): boolean {
  return role === 'organizer'
}
