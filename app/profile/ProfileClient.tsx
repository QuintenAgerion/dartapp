'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { useToast } from '@/hooks/useToast'
import type { Tournament } from '@/types/database'

interface ProfileClientProps {
  userId: string
  email: string
  username: string
  initialAvatarUrl: string | null
  tournaments: { tournament: Tournament; role: string }[]
}

export function ProfileClient({ userId, email, username, initialAvatarUrl, tournaments }: ProfileClientProps) {
  const [newUsername, setNewUsername] = useState(username)
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast('Photo must be smaller than 2MB', 'error')
      return
    }

    setAvatarLoading(true)
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(userId, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast('Failed to upload photo', 'error')
      setAvatarLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(userId)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: urlWithBust })
      .eq('id', userId)

    if (updateError) {
      toast('Failed to save photo', 'error')
    } else {
      setAvatarUrl(urlWithBust)
      toast('Profile photo updated!', 'success')
    }

    setAvatarLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newUsername.trim()
    if (!trimmed || trimmed === username) return

    if (trimmed.length < 2 || trimmed.length > 30) {
      toast('Username must be 2–30 characters', 'error')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('users')
      .update({ username: trimmed })
      .eq('id', userId)

    if (error) {
      if (error.code === '23505') {
        toast('Username already taken', 'error')
      } else {
        toast(error.message, 'error')
      }
    } else {
      toast('Username updated!', 'success')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm text-slate-300 font-medium">Profile</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Profile info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-200">Account</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} name={username || 'U'} size="lg" />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={avatarLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? 'Change photo' : 'Upload photo'}
              </Button>
              <p className="text-xs text-slate-500 mt-1">Max 2MB</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-300">{email}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <Input
              label="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              hint="2–30 characters"
            />
            <Button
              type="submit"
              loading={loading}
              disabled={newUsername.trim() === username || !newUsername.trim()}
              size="sm"
            >
              Save changes
            </Button>
          </form>
        </div>

        {/* Tournament history */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tournament History ({tournaments.length})
          </h2>

          {tournaments.length === 0 ? (
            <p className="text-sm text-slate-500">No tournaments yet.</p>
          ) : (
            <div className="grid gap-3">
              {tournaments.map(({ tournament, role }) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  role={role as 'organizer' | 'player' | 'viewer'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
