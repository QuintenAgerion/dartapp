import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    .select('username')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/NSVV logo.png" alt="NSVV" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              {profile?.username ?? user.email}
            </Link>

            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Sign out
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
