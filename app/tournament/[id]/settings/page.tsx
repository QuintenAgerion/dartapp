import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/tournament/permissions'
import { SettingsForm } from './SettingsForm'
import type { Tournament } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const role = await getMyRole(id, user?.id, supabase)
  if (role !== 'organizer') {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-400">Only the organizer can access settings.</p>
      </div>
    )
  }

  return <SettingsForm tournament={tournament as Tournament} />
}
