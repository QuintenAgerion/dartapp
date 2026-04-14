'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function JoinTournamentForm() {
  const [code, setCode] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed) {
      router.push(`/join/${trimmed}`)
    }
  }

  return (
    <div className="card max-w-sm">
      <p className="text-sm font-semibold text-stone-700 mb-3">Deelnemen via uitnodigingscode</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Voer 8-cijferige code in"
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50"
          maxLength={8}
        />
        <Button type="submit" size="sm" disabled={!code.trim()}>
          Meedoen
        </Button>
      </form>
    </div>
  )
}
