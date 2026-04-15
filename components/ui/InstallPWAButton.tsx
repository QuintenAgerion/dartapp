'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWAButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone =
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches

    if (isStandalone) {
      setInstalled(true)
      return
    }

    if (isIOSDevice) {
      setIsIOS(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setPrompt(null)
      setInstalled(true)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (installed || (!prompt && !isIOS)) return null

  if (isIOS) {
    return (
      <div className="pt-4 border-t border-border">
        <p className="text-sm font-medium text-stone-700 mb-2">App installeren</p>
        <div className="relative">
          <button
            onClick={() => setShowIOSHint(!showIOSHint)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-stone-700 hover:border-accent/50 hover:text-accent transition-colors w-full"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Voeg toe aan beginscherm
          </button>
          {showIOSHint && (
            <div className="mt-2 p-3 rounded-lg bg-stone-50 border border-border text-sm text-stone-600 leading-relaxed">
              Tik op het <strong className="text-stone-800">Deel</strong> icoon{' '}
              <span className="inline-block">
                <svg className="w-4 h-4 inline text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </span>{' '}
              onderaan in Safari, en kies dan <strong className="text-stone-800">Zet op beginscherm</strong>.
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-border">
      <p className="text-sm font-medium text-stone-700 mb-2">App installeren</p>
      <button
        onClick={async () => {
          if (!prompt) return
          await prompt.prompt()
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-stone-700 hover:border-accent/50 hover:text-accent transition-colors w-full"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Voeg toe aan beginscherm
      </button>
    </div>
  )
}
