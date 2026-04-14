import { cn } from '@/lib/utils'

interface LiveBadgeProps {
  className?: string
}

export function LiveBadge({ className }: LiveBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      LIVE
    </span>
  )
}
