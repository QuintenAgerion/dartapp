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
      <p className="text-sm font-medium text-slate-300 mb-3">Join with invite code</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 8-character code"
          className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          maxLength={8}
        />
        <Button type="submit" size="sm" disabled={!code.trim()}>
          Join
        </Button>
      </form>
    </div>
  )
}
