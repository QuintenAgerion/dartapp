import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { buildAvatarMap } from '@/lib/tournament/avatars'
import { InviteLink } from '@/components/tournament/InviteLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PlayersManager } from './PlayersManager'
import type { Tournament, TournamentMember, Group, GroupMember } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function PlayersPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { invite } = await searchParams
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

  // Fetch members
  const { data: members } = await supabase
    .from('tournament_members')
    .select('*')
    .eq('tournament_id', id)
    .order('joined_at', { ascending: true })

  // Fetch groups
  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .eq('tournament_id', id)
    .order('order_index', { ascending: true })

  const groupIds = (groups ?? []).map((g) => g.id)
  const { data: groupMembersData } = groupIds.length
    ? await supabase.from('group_members').select('*').in('group_id', groupIds)
    : { data: [] }

  const allMembers = (members ?? []) as TournamentMember[]
  const allGroups = (groups ?? []) as Group[]
  const allGroupMembers = (groupMembersData ?? []) as GroupMember[]

  // Build group lookup: memberId → group name
  const memberGroupMap = new Map<string, string>()
  for (const g of allGroups) {
    for (const gm of allGroupMembers.filter((m) => m.group_id === g.id)) {
      memberGroupMap.set(gm.member_id, g.name)
    }
  }

  const players = allMembers.filter((m) => m.role === 'player')
  const organizers = allMembers.filter((m) => m.role === 'organizer')

  const avatarMap = await buildAvatarMap(allMembers, supabase)

  const isOrganizerPlayer = user ? allMembers.some((m) => m.user_id === user.id && m.role === 'player') : false
  const organizerProfile = user ? await supabase.from('users').select('username').eq('id', user.id).single() : null
  const organizerDisplayName = organizerProfile?.data?.username ?? 'Organizer'

  return (
    <div className="space-y-6">
      {/* Invite link for organizer */}
      {role === 'organizer' && t.status !== 'completed' && (
        <div className="card">
          <InviteLink inviteCode={t.invite_code} />
        </div>
      )}

      {/* Auto-join prompt */}
      {invite && t.invite_code === invite && user && (
        <JoinPrompt tournamentId={id} userId={user.id} />
      )}

      {/* Players list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200">
            Spelers <span className="text-slate-500 font-normal">({players.length})</span>
          </h3>
        </div>

        {players.length === 0 ? (
          <EmptyState
            title="Nog geen spelers"
            description="Deel de uitnodigingslink zodat spelers kunnen meedoen"
          />
        ) : (
          <div className="space-y-2">
            {players.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Avatar src={avatarMap[member.id]} name={member.display_name} size="sm" />
                  <span className="text-sm text-slate-200">{member.display_name}</span>
                  {memberGroupMap.has(member.id) && (
                    <Badge color="blue">{memberGroupMap.get(member.id)}</Badge>
                  )}
                </div>
                {!member.user_id && (
                  <span className="text-xs text-slate-500">Gast</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizer management tools */}
      {role === 'organizer' && t.status === 'draft' && (
        <PlayersManager
          tournamentId={id}
          organizerUserId={user!.id}
          organizerDisplayName={organizerDisplayName}
          isOrganizerPlayer={isOrganizerPlayer}
        />
      )}

      {/* Organizers */}
      {organizers.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-3">
            Organisatoren
          </h3>
          <div className="space-y-2">
            {organizers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm text-slate-400">
                <Avatar src={avatarMap[m.id]} name={m.display_name} size="sm" />
                {m.display_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple placeholder - would need client interactivity
function JoinPrompt({ tournamentId, userId }: { tournamentId: string; userId: string }) {
  return (
    <div className="card border-accent/30 bg-accent/5">
      <p className="text-sm text-slate-300">Je bent uitgenodigd om aan dit toernooi deel te nemen.</p>
    </div>
  )
}
