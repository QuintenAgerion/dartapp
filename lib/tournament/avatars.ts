import type { SupabaseClient } from '@supabase/supabase-js'
import type { TournamentMember } from '@/types/database'

/**
 * Builds a map of memberId → avatarUrl for all members that have a linked user account.
 * Members without a user_id (guests) are excluded and will show the letter fallback.
 */
export async function buildAvatarMap(
  members: TournamentMember[],
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  const userIds = [...new Set(members.map((m) => m.user_id).filter((id): id is string => id !== null))]
  if (userIds.length === 0) return {}

  const { data: profiles } = await supabase
    .from('users')
    .select('id, avatar_url')
    .in('id', userIds)

  if (!profiles) return {}

  const userAvatarMap = new Map(
    profiles.filter((p) => p.avatar_url).map((p) => [p.id, p.avatar_url as string])
  )

  const result: Record<string, string> = {}
  for (const member of members) {
    if (member.user_id && userAvatarMap.has(member.user_id)) {
      result[member.id] = userAvatarMap.get(member.user_id)!
    }
  }
  return result
}
