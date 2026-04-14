'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GroupMatch, BracketMatch, GroupStanding } from '@/types/database'

interface RealtimeTournamentData {
  groupMatches: GroupMatch[]
  bracketMatches: BracketMatch[]
  standings: GroupStanding[]
  loading: boolean
}

export function useRealtimeTournament(tournamentId: string): RealtimeTournamentData {
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([])
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([])
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient())

  useEffect(() => {
    const sb = supabase.current

    async function fetchInitial() {
      setLoading(true)

      const [gmRes, bmRes, stRes] = await Promise.all([
        sb.from('group_matches').select('*').eq('tournament_id', tournamentId),
        sb.from('bracket_matches').select('*').eq('tournament_id', tournamentId),
        sb.from('group_standings')
          .select('*, member:tournament_members(*)')
          .eq('group_standings.tournament_id' as never, tournamentId),
      ])

      // Fetch standings differently since there's no direct tournament_id on group_standings
      const { data: groupsData } = await sb
        .from('groups')
        .select('id')
        .eq('tournament_id', tournamentId)

      const groupIds = (groupsData ?? []).map((g) => g.id)

      const { data: standingsData } = groupIds.length
        ? await sb
            .from('group_standings')
            .select('*')
            .in('group_id', groupIds)
        : { data: [] }

      if (gmRes.data) setGroupMatches(gmRes.data)
      if (bmRes.data) setBracketMatches(bmRes.data)
      if (standingsData) setStandings(standingsData)

      setLoading(false)
    }

    fetchInitial()

    // Subscribe to group_matches
    const gmChannel = sb
      .channel(`tournament-${tournamentId}-group-matches`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          setGroupMatches((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as GroupMatch]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((m) =>
                m.id === (payload.new as GroupMatch).id ? (payload.new as GroupMatch) : m
              )
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((m) => m.id !== (payload.old as GroupMatch).id)
            }
            return prev
          })
        }
      )
      .subscribe()

    // Subscribe to bracket_matches
    const bmChannel = sb
      .channel(`tournament-${tournamentId}-bracket-matches`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bracket_matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          setBracketMatches((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as BracketMatch]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((m) =>
                m.id === (payload.new as BracketMatch).id ? (payload.new as BracketMatch) : m
              )
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((m) => m.id !== (payload.old as BracketMatch).id)
            }
            return prev
          })
        }
      )
      .subscribe()

    // Subscribe to group_standings via group IDs
    // We re-fetch on any change since filter by list isn't directly supported
    const stChannel = sb
      .channel(`tournament-${tournamentId}-standings`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_standings',
        },
        async () => {
          const { data: gids } = await sb
            .from('groups')
            .select('id')
            .eq('tournament_id', tournamentId)

          const ids = (gids ?? []).map((g) => g.id)
          if (!ids.length) return

          const { data } = await sb
            .from('group_standings')
            .select('*')
            .in('group_id', ids)

          if (data) setStandings(data)
        }
      )
      .subscribe()

    return () => {
      sb.removeChannel(gmChannel)
      sb.removeChannel(bmChannel)
      sb.removeChannel(stChannel)
    }
  }, [tournamentId])

  return { groupMatches, bracketMatches, standings, loading }
}
