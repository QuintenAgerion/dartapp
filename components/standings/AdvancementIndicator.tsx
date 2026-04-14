import { cn } from '@/lib/utils'

interface AdvancementIndicatorProps {
  position: number
  advancingCount: number
  losersCount?: number
  className?: string
}

export function AdvancementIndicator({
  position,
  advancingCount,
  losersCount = 0,
  className,
}: AdvancementIndicatorProps) {
  if (position <= advancingCount) {
    return (
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full bg-green-400',
          className
        )}
        title="Advances to Winners Bracket"
      />
    )
  }

  if (losersCount > 0 && position <= advancingCount + losersCount) {
    return (
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full bg-yellow-400',
          className
        )}
        title="Advances to Losers Bracket"
      />
    )
  }

  return null
}
