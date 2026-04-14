import { cn } from '@/lib/utils'

interface BracketConnectorProps {
  position: 'top' | 'bottom'
  className?: string
}

export function BracketConnector({ position, className }: BracketConnectorProps) {
  return (
    <div
      className={cn(
        'w-6 border-border',
        position === 'top'
          ? 'border-r border-b rounded-br-md h-1/2 self-end'
          : 'border-r border-t rounded-tr-md h-1/2 self-start',
        className
      )}
    />
  )
}
