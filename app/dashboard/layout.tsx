import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  const displayName = profile?.username ?? user.email ?? 'Profile'

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/NSVV logo.png" alt="NSVV" width={32} height={32} className="h-8 w-auto" />
            <span className="font-display uppercase tracking-widest text-sm font-bold text-stone-900 hidden sm:block">NSVV Dart</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-accent/50 transition-colors"
            >
              <Avatar src={profile?.avatar_url} name={displayName} size="sm" />
              <span className="text-sm text-stone-700 font-medium max-w-[120px] truncate">{displayName}</span>
            </Link>

            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
