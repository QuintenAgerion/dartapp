'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { TournamentMember } from '@/types/database'

interface PlayersReorderListProps {
  players: TournamentMember[]
  isOrganizer: boolean
  isDraft: boolean
  avatarMap: Record<string, string>
  memberGroupMap: Record<string, string>
}

export function PlayersReorderList({
  players,
  isOrganizer,
  isDraft,
  avatarMap,
  memberGroupMap,
}: PlayersReorderListProps) {
  const [ordered, setOrdered] = useState(() =>
    [...players].sort((a, b) => {
      if (a.seed == null && b.seed == null) return 0
      if (a.seed == null) return 1
      if (b.seed == null) return -1
      return a.seed - b.seed
    })
  )
  const [swapping, setSwapping] = useState(false)

  const canReorder = isOrganizer && isDraft

  async function handleSwap(idx: number, direction: 'up' | 'down') {
    const otherIdx = direction === 'up' ? idx - 1 : idx + 1
    if (otherIdx < 0 || otherIdx >= ordered.length || swapping) return

    setSwapping(true)

    const newOrdered = [...ordered]
    const tmp = newOrdered[idx]
    newOrdered[idx] = newOrdered[otherIdx]
    newOrdered[otherIdx] = tmp

    const supabase = createClient()
    await Promise.all(
      newOrdered.map((player, i) =>
        supabase.from('tournament_members').update({ seed: i + 1 }).eq('id', player.id)
      )
    )

    setOrdered(newOrdered)
    setSwapping(false)
  }

  return (
    <div className="space-y-0">
      {ordered.map((member, idx) => (
        <div
          key={member.id}
          className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
        >
          <div className="flex items-center gap-2">
            {canReorder && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleSwap(idx, 'up')}
                  disabled={idx === 0 || swapping}
                  className={cn(
                    'w-5 h-5 flex items-center justify-center rounded text-xs transition-colors',
                    idx === 0 || swapping
                      ? 'text-transparent cursor-default'
                      : 'text-stone-400 hover:text-stone-900 hover:bg-surface-2'
                  )}
                >
                  ▲
                </button>
                <button
                  onClick={() => handleSwap(idx, 'down')}
                  disabled={idx === ordered.length - 1 || swapping}
                  className={cn(
                    'w-5 h-5 flex items-center justify-center rounded text-xs transition-colors',
                    idx === ordered.length - 1 || swapping
                      ? 'text-transparent cursor-default'
                      : 'text-stone-400 hover:text-stone-900 hover:bg-surface-2'
                  )}
                >
                  ▼
                </button>
              </div>
            )}
            <Avatar src={avatarMap[member.id]} name={member.display_name} size="sm" />
            <span className="text-sm text-stone-800">{member.display_name}</span>
            {memberGroupMap[member.id] && (
              <Badge color="blue">{memberGroupMap[member.id]}</Badge>
            )}
          </div>
          {!member.user_id && (
            <span className="text-xs text-stone-500">Gast</span>
          )}
        </div>
      ))}
    </div>
  )
}
