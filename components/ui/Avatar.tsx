import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export function Avatar({ src, name, size = 'sm' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover shrink-0', sizeClasses[size])}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-surface-2 flex items-center justify-center font-bold text-slate-400 shrink-0',
        sizeClasses[size]
      )}
    >
      {initial}
    </div>
  )
}
