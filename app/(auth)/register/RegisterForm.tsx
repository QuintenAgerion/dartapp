'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (username.length < 2 || username.length > 30) {
      setError('Gebruikersnaam moet tussen 2 en 30 tekens zijn')
      return
    }

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Dit e-mailadres is al in gebruik')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Er is iets misgegaan — probeer het opnieuw')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-slate-100 mb-6">Account aanmaken</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Gebruikersnaam"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="dartzspeler99"
          required
          autoComplete="username"
          hint="2–30 tekens, gebruikt als weergavenaam"
        />

        <Input
          label="E-mailadres"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jij@voorbeeld.com"
          required
          autoComplete="email"
        />

        <Input
          label="Wachtwoord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          hint="Minimaal 8 tekens"
        />

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Account aanmaken
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Al een account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Inloggen
        </Link>
      </p>
    </div>
  )
}
