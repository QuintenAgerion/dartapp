'use client'

import { cn } from '@/lib/utils'

export interface MatchFilters {
  status: 'all' | 'scheduled' | 'live' | 'completed'
  groupId: string | null
  round: number | null
  boardNumber: number | null
}

interface MatchFilterProps {
  filters: MatchFilters
  onChange: (filters: MatchFilters) => void
  groups: Array<{ id: string; name: string }>
  rounds: number[]
  boards: number[]
}

export function MatchFilter({ filters, onChange, groups, rounds, boards }: MatchFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Status filter */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(['all', 'scheduled', 'live', 'completed'] as const).map((s) => {
          const label = s === 'all' ? 'Alles' : s === 'scheduled' ? 'Gepland' : s === 'live' ? 'Live' : 'Gespeeld'
          return (
            <button
              key={s}
              onClick={() => onChange({ ...filters, status: s })}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                filters.status === s
                  ? 'bg-accent text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-2'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Group filter */}
      {groups.length > 1 && (
        <select
          value={filters.groupId ?? ''}
          onChange={(e) => onChange({ ...filters, groupId: e.target.value || null })}
          className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">Alle poules</option>
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
          <option value="">Alle rondes</option>
          {rounds.map((r) => (
            <option key={r} value={r}>
              Ronde {r}
            </option>
          ))}
        </select>
      )}

      {/* Board filter */}
      {boards.length > 1 && (
        <select
          value={filters.boardNumber ?? ''}
          onChange={(e) => onChange({ ...filters, boardNumber: e.target.value ? parseInt(e.target.value) : null })}
          className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">Alle borden</option>
          {boards.map((b) => (
            <option key={b} value={b}>
              Bord {b}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
