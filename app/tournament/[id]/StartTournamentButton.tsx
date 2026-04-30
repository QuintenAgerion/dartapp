'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { distributePlayersIntoGroups, generateRoundRobinPairs, generateGroupMatches } from '@/lib/tournament/groups'
import { scheduleMatches } from '@/lib/tournament/scheduling'
import { assignScorers, assignGroupScopedScorers } from '@/lib/tournament/scorers'
import { createBracketSkeletons } from '@/lib/tournament/brackets'
import type { TournamentMember } from '@/types/database'

interface StartTournamentButtonProps {
  tournamentId: string
  playerCount: number
}

export function StartTournamentButton({ tournamentId, playerCount }: StartTournamentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showScorerModal, setShowScorerModal] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  function handleStart() {
    if (playerCount < 2) {
      toast('Je hebt minimaal 2 spelers nodig om te starten', 'error')
      return
    }
    setShowScorerModal(true)
  }

  async function handleConfirm(useScorers: boolean) {
    setShowScorerModal(false)
    setLoading(true)
    const supabase = createClient()

    try {
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (tErr || !tournament) throw new Error('Tournament not found')

      const { data: members, error: mErr } = await supabase
        .from('tournament_members')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('role', 'player')

      if (mErr || !members) throw new Error('Failed to fetch players')

      const players = members as TournamentMember[]
      const startTime = tournament.start_date ? new Date(tournament.start_date) : null

      const groupedPlayers = distributePlayersIntoGroups(players, tournament.num_groups)

      type RawSpec = { groupId: string; homeMemberId: string; awayMemberId: string; round: number }
      const allRawSpecs: RawSpec[] = []
      const groupIds: string[] = []
      const groupMembersMap = new Map<string, Set<string>>()
      const groupInfoList: { id: string; orderIndex: number }[] = []

      for (let gi = 0; gi < groupedPlayers.length; gi++) {
        const groupPlayers = groupedPlayers[gi]
        if (groupPlayers.length === 0) continue

        const groupName = String.fromCharCode(65 + gi)

        const { data: group, error: gErr } = await supabase
          .from('groups')
          .insert({ tournament_id: tournamentId, name: `Group ${groupName}`, order_index: gi })
          .select()
          .single()

        if (gErr || !group) throw new Error(`Failed to create group ${groupName}`)

        groupIds[gi] = group.id
        groupMembersMap.set(group.id, new Set(groupPlayers.map(p => p.id)))
        groupInfoList.push({ id: group.id, orderIndex: gi })

        const groupMemberInserts = groupPlayers.map((p, idx) => ({
          group_id: group.id,
          member_id: p.id,
          position: idx,
        }))

        const { error: gmErr } = await supabase.from('group_members').insert(groupMemberInserts)
        if (gmErr) throw new Error('Failed to add players to group')

        const memberIds = groupPlayers.map((p) => p.id)
        for (const pair of generateRoundRobinPairs(memberIds)) {
          allRawSpecs.push({ groupId: group.id, ...pair })
        }

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

      if (allRawSpecs.length > 0) {
        let matchInserts: {
          group_id: string; tournament_id: string; home_member_id: string; away_member_id: string;
          round: number; board_number: number; scheduled_at: string | null; status: 'scheduled';
          home_score: 0; away_score: 0; winner_member_id: null; scorer_member_id: string | null;
        }[]

        if (tournament.single_board_per_group) {
          // Each group gets a fixed board; generate specs per group
          const allGroupSpecs = groupedPlayers.flatMap((gPlayers, gi) => {
            if (gPlayers.length === 0 || !groupIds[gi]) return []
            return generateGroupMatches(
              groupIds[gi],
              tournamentId,
              gPlayers.map(p => p.id),
              tournament.num_boards,
              startTime,
              tournament.avg_match_duration,
              (gi % tournament.num_boards) + 1
            )
          })

          let scorerMap = new Map<string, string>()
          if (useScorers) {
            const specsWithId = allGroupSpecs.map(s => ({
              ...s,
              id: `${s.homeMemberId}-${s.awayMemberId}-${s.round}-${s.groupId}`,
            }))
            scorerMap = assignGroupScopedScorers(specsWithId, groupMembersMap, players, tournament.avg_match_duration)
          }

          matchInserts = allGroupSpecs.map(s => ({
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
            scorer_member_id: useScorers
              ? scorerMap.get(`${s.homeMemberId}-${s.awayMemberId}-${s.round}-${s.groupId}`) ?? null
              : null,
          }))
        } else {
          const scheduled = scheduleMatches(
            allRawSpecs,
            tournament.num_boards,
            tournament.avg_match_duration,
            startTime
          )

          let scorerMap = new Map<string, string>()
          if (useScorers) {
            const scorerSpecs = scheduled.map((s) => ({
              id: `${s.homeMemberId}-${s.awayMemberId}-${s.round}`,
              homeMemberId: s.homeMemberId,
              awayMemberId: s.awayMemberId,
              scheduledAt: s.scheduledAt,
            }))
            const tempMap = assignScorers(scorerSpecs, players, tournament.avg_match_duration)
            scorerMap = new Map(
              scheduled.map((s, i) => [
                String(i),
                tempMap.get(`${s.homeMemberId}-${s.awayMemberId}-${s.round}`) ?? '',
              ])
            )
          }

          matchInserts = scheduled.map((s, i) => ({
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
            scorer_member_id: useScorers ? (scorerMap.get(String(i)) || null) : null,
          }))
        }

        const { error: matchErr } = await supabase.from('group_matches').insert(matchInserts)
        if (matchErr) throw new Error('Failed to create matches')
      }

      const { error: updateErr } = await supabase
        .from('tournaments')
        .update({ status: 'active', use_scorers: useScorers })
        .eq('id', tournamentId)

      if (updateErr) throw new Error('Failed to update tournament status')

      // Pre-generate bracket skeleton with cross-group seeding
      if (tournament.enable_winners_bracket && groupInfoList.length >= 2) {
        await createBracketSkeletons(
          tournamentId,
          groupInfoList,
          tournament.winners_per_group ?? 2,
          tournament.losers_per_group ?? 0,
          tournament.enable_winners_bracket,
          tournament.enable_losers_bracket,
          supabase
        )
      }

      toast('Toernooi gestart! Poules en wedstrijden zijn gegenereerd.', 'success')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start tournament', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleStart} loading={loading} disabled={playerCount < 2}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Toernooi starten ({playerCount} speler{playerCount !== 1 ? 's' : ''})
      </Button>

      <Modal
        open={showScorerModal}
        onClose={() => setShowScorerModal(false)}
        title="Schrijvers genereren?"
        size="sm"
      >
        <p className="text-sm text-stone-500 mb-6">
          Wil je automatisch een schrijver toewijzen aan elke wedstrijd? Schrijvers worden zo gepland
          dat ze niet tegelijk op twee borden schrijven en idealiter niet vlak voor of na hun eigen wedstrijd.
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => handleConfirm(true)}>
            Ja, genereer schrijvers
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => handleConfirm(false)}>
            Nee, zonder schrijvers
          </Button>
        </div>
      </Modal>
    </>
  )
}
