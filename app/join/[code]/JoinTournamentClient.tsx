'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'

interface JoinTournamentClientProps {
  tournamentId: string
  tournamentName: string
  inviteCode: string
  defaultName: string
  userId: string
}

export function JoinTournamentClient({
  tournamentId,
  tournamentName,
  defaultName,
  userId,
}: JoinTournamentClientProps) {
  const [displayName, setDisplayName] = useState(defaultName)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('tournament_members').insert({
      tournament_id: tournamentId,
      user_id: userId,
      display_name: name,
      role: 'player',
    })

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    toast(`Ingeschreven voor ${tournamentName}!`, 'success')
    router.push(`/tournament/${tournamentId}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/NSVV logo.png" alt="NSVV" className="h-16 w-auto mx-auto mb-2" />
          <p className="font-display uppercase tracking-widest text-sm font-bold text-stone-900">NSVV Darttoernooi</p>
        </div>
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 mb-3">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display uppercase tracking-wide">Meedoen</h2>
            <p className="text-stone-500 text-sm mt-1">{tournamentName}</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Weergavenaam"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jouw naam in dit toernooi"
              required
              hint="Zo zien andere spelers jou"
            />

            <Button type="submit" loading={loading} className="w-full">
              Deelnemen
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
