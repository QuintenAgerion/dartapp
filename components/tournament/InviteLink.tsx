'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'

interface InviteLinkProps {
  inviteCode: string
}

export function InviteLink({ inviteCode }: InviteLinkProps) {
  const [copied, setCopied] = useState(false)
  const [inviteUrl, setInviteUrl] = useState(`/join/${inviteCode}`)
  const { toast } = useToast()

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/join/${inviteCode}`)
  }, [inviteCode])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast('Uitnodigingslink gekopieerd!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Kopiëren mislukt', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Invite code — most important, shown prominently */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-1.5">Uitnodigingscode</p>
        <div className="flex items-center gap-3">
          <div className="bg-surface-2 border border-border rounded-lg px-4 py-2.5 font-mono text-2xl font-bold tracking-[0.25em] text-slate-100 select-all">
            {inviteCode}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Gekopieerd
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Link kopiëren
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          Spelers voeren deze code in op het dashboard om mee te doen — of deel de volledige link hieronder.
        </p>
      </div>

      {/* Full URL — secondary */}
      <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-slate-500 truncate font-mono">
        {inviteUrl}
      </div>
    </div>
  )
}
