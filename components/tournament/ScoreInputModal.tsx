'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import type { TournamentMember, MatchFormat } from '@/types/database'
import { validateGroupScore } from '@/lib/tournament/scores'
import { getRequiredLegs } from '@/lib/utils'

interface ScoreInputModalProps {
  open: boolean
  onClose: () => void
  matchId: string
  homeMember: TournamentMember
  awayMember: TournamentMember
  format: MatchFormat
  isBracket?: boolean
  onSuccess?: () => void
}

export function ScoreInputModal({
  open,
  onClose,
  matchId,
  homeMember,
  awayMember,
  format,
  isBracket = false,
  onSuccess,
}: ScoreInputModalProps) {
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const required = getRequiredLegs(format)
  const maxLegs = format === 'bo1' ? 1 : format === 'bo3' ? 3 : 5

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const hs = parseInt(homeScore)
    const as_ = parseInt(awayScore)

    if (isNaN(hs) || isNaN(as_)) {
      setError('Voer geldige scores in')
      return
    }

    const validation = validateGroupScore(hs, as_, format, homeMember.id, awayMember.id)
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid score')
      return
    }

    setLoading(true)
    try {
      const endpoint = isBracket ? '/api/bracket-score' : '/api/group-score'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homeScore: hs, awayScore: as_ }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error ?? 'Failed to submit score')
        return
      }

      toast('Score ingediend!', 'success')
      setHomeScore('')
      setAwayScore('')
      onClose()
      onSuccess?.()
    } catch {
      setError('Netwerkfout — probeer opnieuw')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Score invoeren" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">
          Formaat: <span className="text-slate-200 font-medium">Best of {maxLegs}</span> (eerste tot {required} legs)
        </p>

        <div className="space-y-3">
          {/* Home player */}
          <div className="flex items-center gap-3">
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-slate-200">{homeMember.display_name}</p>
              <p className="text-xs text-slate-500">Thuis</p>
            </div>
            <input
              type="number"
              min={0}
              max={required}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              placeholder="0"
              className="w-16 text-center bg-surface-2 border border-border rounded-lg px-2 py-2 text-slate-100 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              required
            />
          </div>

          <div className="text-center text-slate-600 text-sm font-medium">vs</div>

          {/* Away player */}
          <div className="flex items-center gap-3">
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-slate-200">{awayMember.display_name}</p>
              <p className="text-xs text-slate-500">Uit</p>
            </div>
            <input
              type="number"
              min={0}
              max={required}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              placeholder="0"
              className="w-16 text-center bg-surface-2 border border-border rounded-lg px-2 py-2 text-slate-100 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="md" onClick={onClose} type="button" className="flex-1">
            Annuleren
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Score invoeren
          </Button>
        </div>
      </form>
    </Modal>
  )
}
