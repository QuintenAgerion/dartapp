'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import type { MatchFormat } from '@/types/database'

interface GenerateBracketButtonProps {
  tournamentId: string
  hasBracket: boolean
  tournamentFormat: MatchFormat
  winnersPerGroup: number
  losersPerGroup: number
  numGroups: number
  enableLosers: boolean
}

const FORMAT_OPTIONS: { value: MatchFormat; label: string }[] = [
  { value: 'bo1', label: 'Best of 1' },
  { value: 'bo3', label: 'Best of 3' },
  { value: 'bo5', label: 'Best of 5' },
]

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function roundLabel(fromEnd: number): string {
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Halve Finale'
  if (fromEnd === 2) return 'Kwartfinale'
  return `Ronde van ${Math.pow(2, fromEnd + 1)}`
}

function buildDefaultOverrides(totalRounds: number, defaultFormat: MatchFormat): Record<number, MatchFormat> {
  const defaults: Record<number, MatchFormat> = {}
  for (let i = 0; i < totalRounds; i++) {
    defaults[i] = defaultFormat
  }
  return defaults
}

export function GenerateBracketButton({
  tournamentId,
  hasBracket,
  tournamentFormat,
  winnersPerGroup,
  losersPerGroup,
  numGroups,
  enableLosers,
}: GenerateBracketButtonProps) {
  const [configOpen, setConfigOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const winnersQualifierCount = winnersPerGroup * numGroups
  const winnersBracketSize = nextPowerOfTwo(Math.max(2, winnersQualifierCount))
  const winnersTotalRounds = Math.log2(winnersBracketSize)

  const losersQualifierCount = losersPerGroup * numGroups
  const losersBracketSize = nextPowerOfTwo(Math.max(2, losersQualifierCount))
  const losersTotalRounds = Math.log2(losersBracketSize)

  const [winnersFormatOverrides, setWinnersFormatOverrides] = useState<Record<number, MatchFormat>>(
    () => buildDefaultOverrides(winnersTotalRounds, tournamentFormat)
  )
  const [losersFormatOverrides, setLosersFormatOverrides] = useState<Record<number, MatchFormat>>(
    () => buildDefaultOverrides(losersTotalRounds, tournamentFormat)
  )

  const winnersRounds = useMemo(
    () => Array.from({ length: winnersTotalRounds }, (_, i) => winnersTotalRounds - 1 - i),
    [winnersTotalRounds]
  )

  const losersRounds = useMemo(
    () => Array.from({ length: losersTotalRounds }, (_, i) => losersTotalRounds - 1 - i),
    [losersTotalRounds]
  )

  if (hasBracket) {
    return <p className="text-sm text-green-400">Bracket is gegenereerd.</p>
  }

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          formatOverrides: {
            winners: winnersFormatOverrides,
            losers: losersFormatOverrides,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Bracket genereren mislukt')
      toast('Bracket gegenereerd!', 'success')
      setConfigOpen(false)
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate bracket', 'error')
    } finally {
      setLoading(false)
    }
  }

  function renderRoundRow(
    fromEnd: number,
    totalRounds: number,
    overrides: Record<number, MatchFormat>,
    setOverrides: React.Dispatch<React.SetStateAction<Record<number, MatchFormat>>>
  ) {
    const actualRound = totalRounds - fromEnd
    return (
      <div key={fromEnd} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">{roundLabel(fromEnd)}</p>
          <p className="text-xs text-slate-500">Ronde {actualRound}</p>
        </div>
        <div className="flex gap-1">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOverrides((prev) => ({ ...prev, [fromEnd]: opt.value }))}
              className={
                overrides[fromEnd] === opt.value
                  ? 'px-2.5 py-1 rounded text-xs font-semibold bg-accent text-white'
                  : 'px-2.5 py-1 rounded text-xs font-medium bg-surface-2 text-slate-400 hover:text-slate-200 border border-border'
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfigOpen(true)}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Bracket genereren
      </Button>

      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Bracket instellen" size="sm">
        <div className="space-y-5">
          {/* Winners bracket rounds */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Winnaarsbracket
            </p>
            <p className="text-sm text-slate-500 mb-3">
              {winnersQualifierCount} spelers ({winnersPerGroup}/poule × {numGroups} poules)
              {' → '}<span className="text-slate-300">{winnersTotalRounds} rondes</span>
            </p>
            <div className="space-y-0">
              {winnersRounds.map((fromEnd) =>
                renderRoundRow(fromEnd, winnersTotalRounds, winnersFormatOverrides, setWinnersFormatOverrides)
              )}
            </div>
          </div>

          {/* Losers bracket rounds */}
          {enableLosers && losersQualifierCount >= 2 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Verlizersbracket
              </p>
              <p className="text-sm text-slate-500 mb-3">
                {losersQualifierCount} spelers ({losersPerGroup}/poule × {numGroups} poules)
                {' → '}<span className="text-slate-300">{losersTotalRounds} rondes</span>
              </p>
              <div className="space-y-0">
                {losersRounds.map((fromEnd) =>
                  renderRoundRow(fromEnd, losersTotalRounds, losersFormatOverrides, setLosersFormatOverrides)
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConfigOpen(false)} className="flex-1" disabled={loading}>
              Annuleren
            </Button>
            <Button onClick={handleGenerate} loading={loading} className="flex-1">
              Bracket genereren
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
