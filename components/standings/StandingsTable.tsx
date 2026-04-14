'use client'

import type { GroupStanding, TournamentMember } from '@/types/database'
import { AdvancementIndicator } from './AdvancementIndicator'
import { cn } from '@/lib/utils'

interface StandingsRow extends GroupStanding {
  member: TournamentMember
}

interface StandingsTableProps {
  standings: StandingsRow[]
  groupName: string
  advancingCount?: number
  losersCount?: number
  highlightMemberId?: string
  isOrganizer?: boolean
  allMatchesPlayed?: boolean
  onSwap?: (idxA: number, idxB: number) => void
}

export function StandingsTable({
  standings,
  groupName,
  advancingCount = 2,
  losersCount = 0,
  highlightMemberId,
  isOrganizer = false,
  allMatchesPlayed = false,
  onSwap,
}: StandingsTableProps) {
  // standings array is pre-sorted by StandingsClient (tiebreakers applied)
  const rows = standings

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-slate-200">{groupName}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 w-8">#</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Player</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 w-10">P</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 w-10">W</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 w-10">L</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 w-16 hidden sm:table-cell">Legs</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 w-12 hidden sm:table-cell">Diff</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 w-12">Pts</th>
              {isOrganizer && <th className="px-2 py-2 w-14" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const displayPosition = idx + 1
              const isAdvancing = displayPosition <= advancingCount
              const isLosers =
                losersCount > 0 &&
                displayPosition > advancingCount &&
                displayPosition <= advancingCount + losersCount
              const isHighlighted = row.member.id === highlightMemberId

              const prevTied = idx > 0 && rows[idx - 1].points === row.points
              const nextTied = idx < rows.length - 1 && rows[idx + 1].points === row.points
              const canMoveUp = isOrganizer && allMatchesPlayed && prevTied
              const canMoveDown = isOrganizer && allMatchesPlayed && nextTied

              return (
                <tr
                  key={row.member.id}
                  className={cn(
                    'border-b border-border/50 last:border-0 transition-colors',
                    isHighlighted && 'bg-accent/5',
                    isAdvancing && !isHighlighted && 'bg-green-500/5'
                  )}
                >
                  <td className="px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{displayPosition}</span>
                      <AdvancementIndicator
                        position={displayPosition}
                        advancingCount={advancingCount}
                        losersCount={losersCount}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isHighlighted ? 'text-accent' : 'text-slate-200'
                      )}
                    >
                      {row.member.display_name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm text-slate-400">{row.played}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-green-400 font-medium">{row.wins}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-red-400 font-medium">{row.losses}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-slate-400 hidden sm:table-cell">
                    {row.legs_for}/{row.legs_against}
                  </td>
                  <td className={cn(
                    'px-4 py-2.5 text-center text-sm font-medium hidden sm:table-cell',
                    row.leg_difference > 0 ? 'text-green-400' : row.leg_difference < 0 ? 'text-red-400' : 'text-slate-400'
                  )}>
                    {row.leg_difference > 0 ? '+' : ''}{row.leg_difference}
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm font-bold text-slate-100">{row.points}</td>

                  {isOrganizer && (
                    <td className="px-2 py-1.5 text-center">
                      {(canMoveUp || canMoveDown) && (
                        <div className="flex flex-col gap-0.5 items-center">
                          <button
                            onClick={() => canMoveUp && onSwap?.(idx - 1, idx)}
                            disabled={!canMoveUp}
                            title="Move up"
                            className={cn(
                              'w-5 h-5 flex items-center justify-center rounded text-xs transition-colors',
                              canMoveUp
                                ? 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
                                : 'text-transparent cursor-default'
                            )}
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => canMoveDown && onSwap?.(idx, idx + 1)}
                            disabled={!canMoveDown}
                            title="Move down"
                            className={cn(
                              'w-5 h-5 flex items-center justify-center rounded text-xs transition-colors',
                              canMoveDown
                                ? 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
                                : 'text-transparent cursor-default'
                            )}
                          >
                            ▼
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={isOrganizer ? 9 : 8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No players in this group
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(advancingCount > 0 || losersCount > 0) && (
        <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3">
          {advancingCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Top {advancingCount} advance to winners bracket
            </span>
          )}
          {losersCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              Next {losersCount} advance to losers bracket
            </span>
          )}
        </div>
      )}
    </div>
  )
}
