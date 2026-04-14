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
}

export function StandingsTable({
  standings,
  groupName,
  advancingCount = 2,
  losersCount = 0,
  highlightMemberId,
}: StandingsTableProps) {
  const sorted = [...standings].sort((a, b) => a.position - b.position)

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
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const isAdvancing = row.position <= advancingCount
              const isLosers =
                losersCount > 0 &&
                row.position > advancingCount &&
                row.position <= advancingCount + losersCount
              const isHighlighted = row.member.id === highlightMemberId

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
                      <span className="text-slate-500">{row.position}</span>
                      <AdvancementIndicator
                        position={row.position}
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
                </tr>
              )
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
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
