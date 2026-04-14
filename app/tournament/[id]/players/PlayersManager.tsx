'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'

interface PlayersManagerProps {
  tournamentId: string
}

export function PlayersManager({ tournamentId }: PlayersManagerProps) {
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

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
  )
}
