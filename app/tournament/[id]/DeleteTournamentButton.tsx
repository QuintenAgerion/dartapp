'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'

interface DeleteTournamentButtonProps {
  tournamentId: string
  tournamentName: string
}

export function DeleteTournamentButton({ tournamentId, tournamentName }: DeleteTournamentButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch('/api/delete-tournament', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete tournament')
      toast('Tournament deleted', 'success')
      router.push('/dashboard')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete tournament', 'error')
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete tournament
      </Button>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete tournament" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-100">{tournamentName}</span>?
          </p>
          <p className="text-sm text-slate-500">
            This will permanently remove all groups, matches, standings, and brackets. This cannot be undone.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={loading}
              className="flex-1"
            >
              Yes, delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
