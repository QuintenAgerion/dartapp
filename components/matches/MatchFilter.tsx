'use client'

import { cn } from '@/lib/utils'

export interface MatchFilters {
  status: 'all' | 'scheduled' | 'live' | 'completed'
  groupId: string | null
  round: number | null
}

interface MatchFilterProps {
  filters: MatchFilters
  onChange: (filters: MatchFilters) => void
  groups: Array<{ id: string; name: string }>
  rounds: number[]
}

export function MatchFilter({ filters, onChange, groups, rounds }: MatchFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Status filter */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(['all', 'scheduled', 'live', 'completed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onChange({ ...filters, status: s })}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
              filters.status === s
                ? 'bg-accent text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-2'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Group filter */}
      {groups.length > 1 && (
        <select
          value={filters.groupId ?? ''}
          onChange={(e) => onChange({ ...filters, groupId: e.target.value || null })}
          className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}

      {/* Round filter */}
      {rounds.length > 1 && (
        <select
          value={filters.round ?? ''}
          onChange={(e) => onChange({ ...filters, round: e.target.value ? parseInt(e.target.value) : null })}
          className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">All rounds</option>
          {rounds.map((r) => (
            <option key={r} value={r}>
              Round {r}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
