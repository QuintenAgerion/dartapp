'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/hooks/useToast'
import type { Tournament, MatchFormat } from '@/types/database'

export function SettingsForm({ tournament }: { tournament: Tournament }) {
  const isDraft = tournament.status === 'draft'
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(tournament.name)
  const [description, setDescription] = useState(tournament.description ?? '')
  const [startDate, setStartDate] = useState(tournament.start_date?.slice(0, 16) ?? '')
  const [numBoards, setNumBoards] = useState(tournament.num_boards)
  const [avgDuration, setAvgDuration] = useState(tournament.avg_match_duration)

  const [matchFormat, setMatchFormat] = useState<MatchFormat>(tournament.match_format)
  const [numGroups, setNumGroups] = useState(tournament.num_groups)
  const [enableWinners, setEnableWinners] = useState(tournament.enable_winners_bracket)
  const [enableLosers, setEnableLosers] = useState(tournament.enable_losers_bracket)
  const [winnersPerGroup, setWinnersPerGroup] = useState(tournament.winners_per_group)
  const [losersPerGroup, setLosersPerGroup] = useState(tournament.losers_per_group)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload: Record<string, unknown> = {
      tournamentId: tournament.id,
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      num_boards: numBoards,
      avg_match_duration: avgDuration,
    }

    if (isDraft) {
      Object.assign(payload, {
        match_format: matchFormat,
        num_groups: numGroups,
        enable_winners_bracket: enableWinners,
        enable_losers_bracket: enableLosers && enableWinners,
        winners_per_group: enableWinners ? winnersPerGroup : 2,
        losers_per_group: enableWinners && enableLosers ? losersPerGroup : 0,
      })
    }

    try {
      const res = await fetch('/api/update-tournament', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      toast('Settings saved!', 'success')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {!isDraft && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-300">
          Het toernooi is actief — structurele instellingen (formaat, poules, brackets) zijn vergrendeld.
          Je kunt wel de naam, datum, borden en wedstrijdduur aanpassen.
        </div>
      )}

      {/* Basic info */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Basisinformatie</h2>

        <Input
          label="Naam toernooi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Textarea
          label="Omschrijving"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optionele omschrijving..."
        />

        <Input
          label="Startdatum &amp; tijd"
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      {/* Structural format — draft only */}
      {isDraft && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Formaat</h2>

          <Select
            label="Wedstrijdformaat"
            value={matchFormat}
            onChange={(e) => setMatchFormat(e.target.value as MatchFormat)}
            options={[
              { value: 'bo1', label: 'Best of 1' },
              { value: 'bo3', label: 'Best of 3' },
              { value: 'bo5', label: 'Best of 5' },
            ]}
          />

          <div>
            <label className="text-sm font-medium text-stone-700">Aantal poules</label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="range" min={1} max={8} value={numGroups}
                onChange={(e) => setNumGroups(parseInt(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="w-8 text-center text-stone-800 font-medium">{numGroups}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={enableWinners}
                onChange={(e) => { setEnableWinners(e.target.checked); if (!e.target.checked) setEnableLosers(false) }}
                className="w-4 h-4 accent-accent rounded"
              />
              <div>
                <p className="text-sm font-medium text-stone-700">Winnaarsbracket</p>
                <p className="text-xs text-stone-500">Topspelers uit elke poule gaan door naar een knockoutbracket</p>
              </div>
            </label>

            {enableWinners && (
              <>
                <label className="flex items-center gap-3 cursor-pointer ml-7">
                  <input
                    type="checkbox" checked={enableLosers}
                    onChange={(e) => setEnableLosers(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-700">Verlizersbracket</p>
                    <p className="text-xs text-stone-500">Troostbracket voor lager geplaatste kwalificanten</p>
                  </div>
                </label>

                <div className="ml-7 space-y-3 rounded-lg bg-surface-2 border border-border p-3">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Doorstroming per poule</p>

                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-accent shrink-0" />
                    <span className="text-sm text-stone-700 flex-1">Spelers naar winnaarsbracket</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setWinnersPerGroup(Math.max(1, winnersPerGroup - 1))} className="w-6 h-6 rounded border border-border text-stone-500 hover:text-stone-800 text-sm font-bold leading-none">−</button>
                      <span className="w-5 text-center text-stone-900 font-semibold">{winnersPerGroup}</span>
                      <button type="button" onClick={() => setWinnersPerGroup(Math.min(8, winnersPerGroup + 1))} className="w-6 h-6 rounded border border-border text-stone-500 hover:text-stone-800 text-sm font-bold leading-none">+</button>
                    </div>
                  </div>

                  {enableLosers && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-stone-400 shrink-0" />
                      <span className="text-sm text-stone-700 flex-1">Spelers naar verlizersbracket</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setLosersPerGroup(Math.max(0, losersPerGroup - 1))} className="w-6 h-6 rounded border border-border text-stone-500 hover:text-stone-800 text-sm font-bold leading-none">−</button>
                        <span className="w-5 text-center text-stone-900 font-semibold">{losersPerGroup}</span>
                        <button type="button" onClick={() => setLosersPerGroup(Math.min(8, losersPerGroup + 1))} className="w-6 h-6 rounded border border-border text-stone-500 hover:text-stone-800 text-sm font-bold leading-none">+</button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-stone-500 pt-1 border-t border-border">
                    Top {winnersPerGroup} × {numGroups} poule{numGroups > 1 ? 's' : ''} ={' '}
                    <span className="text-stone-700 font-medium">{winnersPerGroup * numGroups} spelers</span> in winnaarsbracket
                    {enableLosers && losersPerGroup > 0 && (
                      <>, volgende {losersPerGroup} × {numGroups} ={' '}
                      <span className="text-stone-700 font-medium">{losersPerGroup * numGroups}</span> in verlizersbracket</>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Venue */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Locatie</h2>

        <div>
          <label className="text-sm font-medium text-stone-700">Aantal borden</label>
          <div className="mt-1.5 flex items-center gap-3">
            <input
              type="range" min={1} max={16} value={numBoards}
              onChange={(e) => setNumBoards(parseInt(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="w-8 text-center text-stone-800 font-medium">{numBoards}</span>
          </div>
        </div>

        <Input
          label="Gemiddelde wedstrijdduur (minuten)"
          type="number"
          min={5}
          max={120}
          value={avgDuration}
          onChange={(e) => setAvgDuration(parseInt(e.target.value) || 20)}
          hint="Gebruikt voor het schatten van wedstrijdschema's"
        />
      </div>

      <Button type="submit" loading={loading}>
        Instellingen opslaan
      </Button>
    </form>
  )
}
