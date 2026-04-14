'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Handle implicit flow (magic link, password recovery) — tokens arrive in hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/dashboard')
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return <PageLoader />
}
