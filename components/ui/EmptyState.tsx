import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-2 text-stone-400">
          {icon}
        </div>
      )}
      <div>
        <p className="text-base font-semibold text-stone-700">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-stone-500 max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
