'use client'

import type { BracketMatch, TournamentMember, MatchFormat } from '@/types/database'
import { BracketMatchCard } from './BracketMatch'

interface BracketViewProps {
  matches: BracketMatch[]
  members: TournamentMember[]
  format: MatchFormat
  canSubmitScore: boolean
  title?: string
}

export function BracketView({ matches, members, format, canSubmitScore, title }: BracketViewProps) {
  const memberMap = new Map(members.map((m) => [m.id, m]))

  // Group by round
  const rounds = new Map<number, BracketMatch[]>()
  for (const match of matches) {
    const arr = rounds.get(match.round) ?? []
    arr.push(match)
    rounds.set(match.round, arr)
  }

  const sortedRounds = [...rounds.keys()].sort((a, b) => a - b)
  const maxRound = Math.max(...sortedRounds, 1)

  function getRoundLabel(round: number): string {
    const matchesInRound = (rounds.get(round) ?? []).length
    if (round === maxRound) return 'Final'
    if (round === maxRound - 1 && matchesInRound === 2) return 'Semi-Final'
    if (round === maxRound - 2 && matchesInRound === 4) return 'Quarter-Final'
    return `Round ${round}`
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-sm">{title ? `${title} bracket` : 'Bracket'} not yet generated</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      {title && (
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-6">{title}</h3>
      )}

      <div className="flex flex-row gap-12 min-w-max items-center">
        {sortedRounds.map((round) => {
          const roundMatches = (rounds.get(round) ?? []).sort(
            (a, b) => a.match_number - b.match_number
          )
          const label = getRoundLabel(round)

          return (
            <div key={round} className="flex flex-col">
              {/* Round label */}
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-6 text-center">
                {label}
              </p>

              {/* Matches stacked with spacing to align with connectors */}
              <div className="flex flex-col" style={{
                gap: `${Math.pow(2, round - 1) * 24}px`,
              }}>
                {roundMatches.map((match, matchIdx) => {
                  const homeMember = match.home_member_id
                    ? (memberMap.get(match.home_member_id) ?? null)
                    : null
                  const awayMember = match.away_member_id
                    ? (memberMap.get(match.away_member_id) ?? null)
                    : null

                  return (
                    <div key={match.id} className="relative flex items-center">
                      <BracketMatchCard
                        match={match}
                        homeMember={homeMember}
                        awayMember={awayMember}
                        format={format}
                        canSubmitScore={canSubmitScore}
                      />

                      {/* Connector line to next round */}
                      {round < maxRound && (
                        <div className="absolute left-full top-0 bottom-0 flex items-center">
                          <div
                            className="border-r border-border h-full"
                            style={{ width: '24px' }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
