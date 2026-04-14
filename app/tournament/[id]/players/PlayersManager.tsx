'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'

interface PlayersManagerProps {
  tournamentId: string
  organizerUserId: string
  organizerDisplayName: string
  isOrganizerPlayer: boolean
}

export function PlayersManager({ tournamentId, organizerUserId, organizerDisplayName, isOrganizerPlayer }: PlayersManagerProps) {
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleJoinAsPlayer() {
    setJoinLoading(true)
    const supabase = createClient()
    // Upsert handles both: organizer already has a row (update) or not (insert)
    const { error } = await supabase.from('tournament_members').upsert(
      {
        tournament_id: tournamentId,
        user_id: organizerUserId,
        display_name: organizerDisplayName,
        role: 'player',
      },
      { onConflict: 'tournament_id,user_id' }
    )
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Je doet nu mee als speler', 'success')
      router.refresh()
    }
    setJoinLoading(false)
  }

  async function handleLeaveAsPlayer() {
    setJoinLoading(true)
    const supabase = createClient()
    // Delete the row entirely — organizer status is determined by tournaments.organizer_id, not this row
    const { error } = await supabase
      .from('tournament_members')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', organizerUserId)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Je doet niet meer mee als speler', 'success')
      router.refresh()
    }
    setJoinLoading(false)
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const name = playerName.trim()
    if (!name) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('tournament_members').insert({
      tournament_id: tournamentId,
      user_id: null,
      display_name: name,
      role: 'player',
    })

    if (error) {
      toast(error.message, 'error')
    } else {
      toast(`${name} added`, 'success')
      setPlayerName('')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {/* Join as player */}
      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-200">Meedoen als speler</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOrganizerPlayer
              ? `Je doet mee als speler (${organizerDisplayName})`
              : 'Voeg jezelf toe als speler aan dit toernooi'}
          </p>
        </div>
        {isOrganizerPlayer ? (
          <Button variant="secondary" size="sm" loading={joinLoading} onClick={handleLeaveAsPlayer}>
            Niet meer meedoen
          </Button>
        ) : (
          <Button size="sm" loading={joinLoading} onClick={handleJoinAsPlayer}>
            Meedoen
          </Button>
        )}
      </div>

    <div className="card">
      <h3 className="font-semibold text-slate-200 mb-3">Add player manually</h3>
      <p className="text-sm text-slate-500 mb-3">
        Add a guest player by name (no account required).
      </p>
      <form onSubmit={handleAddPlayer} className="flex gap-2">
        <Input
          placeholder="Player name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="flex-1"
          required
        />
        <Button type="submit" loading={loading} disabled={!playerName.trim()}>
          Add
        </Button>
      </form>
    </div>
    </div>
  )
}
