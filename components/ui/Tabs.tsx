'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
}

interface TabsProps {
  tabs: Tab[]
  className?: string
}

export function Tabs({ tabs, className }: TabsProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'flex gap-0.5 border-b border-border overflow-x-auto scrollbar-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all',
              isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
