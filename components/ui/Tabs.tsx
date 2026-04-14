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
        'flex gap-1 border-b border-border overflow-x-auto scrollbar-none',
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
              'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              isActive
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-200 hover:border-neutral-600'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
