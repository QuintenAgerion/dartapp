'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/hooks/useToast'
import { nanoid } from 'nanoid'

const formatOptions = [
  { value: 'bo1', label: 'Best of 1' },
  { value: 'bo3', label: 'Best of 3' },
  { value: 'bo5', label: 'Best of 5' },
]

function suggestAdvancement(numGroups: number): { winners: number; losers: number } {
  if (numGroups === 1) return { winners: 4, losers: 2 }
  if (numGroups === 2) return { winners: 4, losers: 2 }
  if (numGroups === 3) return { winners: 3, losers: 1 }
  return { winners: 2, losers: 1 }
}

export default function CreateTournamentPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [matchFormat, setMatchFormat] = useState('bo3')
  const [numGroups, setNumGroups] = useState(2)
  const [enableWinners, setEnableWinners] = useState(true)
  const [enableLosers, setEnableLosers] = useState(false)
  const [winnersPerGroup, setWinnersPerGroup] = useState(2)
  const [losersPerGroup, setLosersPerGroup] = useState(0)
  const [numBoards, setNumBoards] = useState(2)
  const [avgDuration, setAvgDuration] = useState(20)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const { toast } = useToast()

  function handleNumGroupsChange(val: number) {
    setNumGroups(val)
    const suggested = suggestAdvancement(val)
    setWinnersPerGroup(suggested.winners)
    if (enableLosers) setLosersPerGroup(suggested.losers)
  }

  function handleEnableLosersChange(checked: boolean) {
    setEnableLosers(checked)
    if (checked && losersPerGroup === 0) {
      setLosersPerGroup(suggestAdvancement(numGroups).losers)
    }
    if (!checked) setLosersPerGroup(0)
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim() || name.length < 2) newErrors.name = 'Naam moet minimaal 2 tekens zijn'
    if (name.length > 100) newErrors.name = 'Naam moet korter zijn dan 100 tekens'
    if (description.length > 500) newErrors.description = 'Omschrijving moet korter zijn dan 500 tekens'
    if (numGroups < 1 || numGroups > 8) newErrors.numGroups = 'Moet tussen 1 en 8 zijn'
    if (numBoards < 1 || numBoards > 16) newErrors.numBoards = 'Moet tussen 1 en 16 zijn'
    if (avgDuration < 5 || avgDuration > 120) newErrors.avgDuration = 'Moet tussen 5 en 120 minuten zijn'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('Je moet ingelogd zijn', 'error')
      setLoading(false)
      return
    }

    // Safety net: ensure user profile exists before inserting tournament (FK guard)
    const { data: existingProfile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      const fallbackUsername = user.email?.split('@')[0] ?? 'user'
      await supabase.from('users').upsert(
        { id: user.id, username: fallbackUsername, avatar_url: null },
        { onConflict: 'id' }
      )
    }

    const inviteCode = nanoid(8)

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        organizer_id: user.id,
        start_date: startDate || null,
        match_format: matchFormat as 'bo1' | 'bo3' | 'bo5',
        num_groups: numGroups,
        enable_winners_bracket: enableWinners,
        enable_losers_bracket: enableLosers && enableWinners,
        winners_per_group: enableWinners ? winnersPerGroup : 2,
        losers_per_group: enableWinners && enableLosers ? losersPerGroup : 0,
        num_boards: numBoards,
        avg_match_duration: avgDuration,
        use_scorers: false,
        status: 'draft',
        invite_code: inviteCode,
      })
      .select()
      .single()

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    // Also add organizer as a member
    await supabase.from('tournament_members').insert({
      tournament_id: tournament.id,
      user_id: user.id,
      display_name: (await supabase.from('users').select('username').eq('id', user.id).single()).data?.username ?? 'Organizer',
      role: 'organizer',
    })

    toast('Toernooi aangemaakt!', 'success')
    router.push(`/tournament/${tournament.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>
          <h1 className="text-2xl font-bold text-slate-100">Toernooi aanmaken</h1>
          <p className="text-slate-500 text-sm mt-1">Stel een nieuw darttoernooi in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basisinformatie</h2>

            <Input
              label="Naam toernooi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday Night Darts"
              required
              error={errors.name}
            />

            <Textarea
              label="Omschrijving"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele omschrijving..."
              error={errors.description}
            />

            <Input
              label="Startdatum &amp; tijd"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Format settings */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Formaat</h2>

            <Select
              label="Wedstrijdformaat"
              value={matchFormat}
              onChange={(e) => setMatchFormat(e.target.value)}
              options={formatOptions}
            />

            <div>
              <label className="text-sm font-medium text-slate-300">
                Aantal poules
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={numGroups}
                  onChange={(e) => handleNumGroupsChange(parseInt(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="w-8 text-center text-slate-200 font-medium">{numGroups}</span>
              </div>
              {errors.numGroups && <p className="text-xs text-red-400 mt-1">{errors.numGroups}</p>}
            </div>

            {/* Bracket options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableWinners}
                  onChange={(e) => {
                    setEnableWinners(e.target.checked)
                    if (!e.target.checked) setEnableLosers(false)
                  }}
                  className="w-4 h-4 accent-accent rounded"
                />
                <div>
                  <p className="text-sm font-medium text-slate-300">Winnaarsbracket</p>
                  <p className="text-xs text-slate-500">Topspelers uit elke poule gaan door naar een knockoutbracket</p>
                </div>
              </label>

              {enableWinners && (
                <label className="flex items-center gap-3 cursor-pointer ml-7">
                  <input
                    type="checkbox"
                    checked={enableLosers}
                    onChange={(e) => handleEnableLosersChange(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-300">Verlizersbracket</p>
                    <p className="text-xs text-slate-500">Herkansing voor verliezers uit de eerste ronde</p>
                  </div>
                </label>
              )}

              {/* Advancement config */}
              {enableWinners && (
                <div className="ml-7 mt-2 space-y-3 rounded-lg bg-surface-2 border border-border p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doorstroming per poule</p>

                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-accent shrink-0" />
                    <span className="text-sm text-slate-300 flex-1">Spelers naar winnaarsbracket</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWinnersPerGroup(Math.max(1, winnersPerGroup - 1))}
                        className="w-6 h-6 rounded border border-border text-slate-400 hover:text-slate-200 text-sm font-bold leading-none"
                      >−</button>
                      <span className="w-5 text-center text-slate-100 font-semibold">{winnersPerGroup}</span>
                      <button
                        type="button"
                        onClick={() => setWinnersPerGroup(Math.min(8, winnersPerGroup + 1))}
                        className="w-6 h-6 rounded border border-border text-slate-400 hover:text-slate-200 text-sm font-bold leading-none"
                      >+</button>
                    </div>
                  </div>

                  {enableLosers && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-slate-500 shrink-0" />
                      <span className="text-sm text-slate-300 flex-1">Spelers naar verlizersbracket</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLosersPerGroup(Math.max(0, losersPerGroup - 1))}
                          className="w-6 h-6 rounded border border-border text-slate-400 hover:text-slate-200 text-sm font-bold leading-none"
                        >−</button>
                        <span className="w-5 text-center text-slate-100 font-semibold">{losersPerGroup}</span>
                        <button
                          type="button"
                          onClick={() => setLosersPerGroup(Math.min(8, losersPerGroup + 1))}
                          className="w-6 h-6 rounded border border-border text-slate-400 hover:text-slate-200 text-sm font-bold leading-none"
                        >+</button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 pt-1 border-t border-border">
                    Top {winnersPerGroup} × {numGroups} poule{numGroups > 1 ? 's' : ''} = <span className="text-slate-300 font-medium">{winnersPerGroup * numGroups} spelers</span> in winnaarsbracket
                    {enableLosers && losersPerGroup > 0 && (
                      <>, volgende {losersPerGroup} × {numGroups} = <span className="text-slate-300 font-medium">{losersPerGroup * numGroups}</span> in verlizersbracket</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Venue settings */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Locatie</h2>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Aantal borden
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={numBoards}
                  onChange={(e) => setNumBoards(parseInt(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="w-8 text-center text-slate-200 font-medium">{numBoards}</span>
              </div>
              {errors.numBoards && <p className="text-xs text-red-400 mt-1">{errors.numBoards}</p>}
            </div>

            <Input
              label="Gemiddelde wedstrijdduur (minuten)"
              type="number"
              min={5}
              max={120}
              value={avgDuration}
              onChange={(e) => setAvgDuration(parseInt(e.target.value) || 20)}
              error={errors.avgDuration}
              hint="Gebruikt voor het schatten van wedstrijdschema's"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Toernooi aanmaken
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
