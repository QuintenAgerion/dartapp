'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { distributePlayersIntoGroups, generateRoundRobinPairs } from '@/lib/tournament/groups'
import { scheduleMatches } from '@/lib/tournament/scheduling'
import type { TournamentMember } from '@/types/database'

interface StartTournamentButtonProps {
  tournamentId: string
  playerCount: number
}

export function StartTournamentButton({ tournamentId, playerCount }: StartTournamentButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleStart() {
    if (playerCount < 2) {
      toast('You need at least 2 players to start', 'error')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch tournament details
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (tErr || !tournament) throw new Error('Tournament not found')

      // Fetch all players
      const { data: members, error: mErr } = await supabase
        .from('tournament_members')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('role', 'player')

      if (mErr || !members) throw new Error('Failed to fetch players')

      const players = members as TournamentMember[]
      const startTime = tournament.start_date ? new Date(tournament.start_date) : null

      // Distribute into groups
      const groupedPlayers = distributePlayersIntoGroups(players, tournament.num_groups)

      // Collect raw match pairs from all groups before doing board assignment
      type RawSpec = { groupId: string; homeMemberId: string; awayMemberId: string; round: number }
      const allRawSpecs: RawSpec[] = []

      for (let gi = 0; gi < groupedPlayers.length; gi++) {
        const groupPlayers = groupedPlayers[gi]
        if (groupPlayers.length === 0) continue

        const groupName = String.fromCharCode(65 + gi) // A, B, C, ...

        // Create group
        const { data: group, error: gErr } = await supabase
          .from('groups')
          .insert({ tournament_id: tournamentId, name: `Group ${groupName}`, order_index: gi })
          .select()
          .single()

        if (gErr || !group) throw new Error(`Failed to create group ${groupName}`)

        // Add members to group
        const groupMemberInserts = groupPlayers.map((p, idx) => ({
          group_id: group.id,
          member_id: p.id,
          position: idx,
        }))

        const { error: gmErr } = await supabase
          .from('group_members')
          .insert(groupMemberInserts)

        if (gmErr) throw new Error('Failed to add players to group')

        // Collect raw pairs (no board assignment yet — done globally below)
        const memberIds = groupPlayers.map((p) => p.id)
        for (const pair of generateRoundRobinPairs(memberIds)) {
          allRawSpecs.push({ groupId: group.id, ...pair })
        }

        // Initialize standings
        const standingInserts = groupPlayers.map((p) => ({
          group_id: group.id,
          member_id: p.id,
          played: 0,
          wins: 0,
          losses: 0,
          legs_for: 0,
          legs_against: 0,
          position: 0,
        }))

        const { error: stErr } = await supabase.from('group_standings').insert(standingInserts)
        if (stErr) throw new Error('Failed to initialize standings')
      }

      // Global scheduling: assign boards across ALL groups so no board is double-booked
      if (allRawSpecs.length > 0) {
        const scheduled = scheduleMatches(
          allRawSpecs,
          tournament.num_boards,
          tournament.avg_match_duration,
          startTime
        )
        const matchInserts = scheduled.map((s) => ({
          group_id: s.groupId,
          tournament_id: tournamentId,
          home_member_id: s.homeMemberId,
          away_member_id: s.awayMemberId,
          round: s.round,
          board_number: s.boardNumber,
          scheduled_at: s.scheduledAt,
          status: 'scheduled' as const,
          home_score: 0,
          away_score: 0,
          winner_member_id: null,
        }))
        const { error: matchErr } = await supabase.from('group_matches').insert(matchInserts)
        if (matchErr) throw new Error('Failed to create matches')
      }

      // Update tournament status
      const { error: updateErr } = await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', tournamentId)

      if (updateErr) throw new Error('Failed to update tournament status')

      toast('Tournament started! Groups and matches have been generated.', 'success')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start tournament', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleStart} loading={loading} disabled={playerCount < 2}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Start Tournament ({playerCount} player{playerCount !== 1 ? 's' : ''})
    </Button>
  )
}
