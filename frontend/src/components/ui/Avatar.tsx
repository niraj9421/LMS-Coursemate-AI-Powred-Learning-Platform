import { cn } from '@/utils/cn'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  online?: boolean
}

const sizeClasses = {
  xs:  'h-6 w-6 text-[10px]',
  sm:  'h-8 w-8 text-xs',
  md:  'h-9 w-9 text-sm',
  lg:  'h-11 w-11 text-base',
  xl:  'h-14 w-14 text-lg',
  '2xl': 'h-20 w-20 text-2xl',
}

const onlineSizes = {
  xs: 'h-1.5 w-1.5', sm: 'h-2 w-2', md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3', xl: 'h-3.5 w-3.5', '2xl': 'h-4 w-4',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function getColor(name?: string): string {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-violet-600',
    'from-green-500 to-emerald-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-teal-600',
  ]
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return colors[idx]!
}

export function Avatar({ src, name, size = 'md', className, online }: AvatarProps) {
  return (
    <div className="relative inline-flex shrink-0" aria-label={name ?? 'User avatar'}>
      <div className={cn(
        'rounded-full overflow-hidden shrink-0',
        !src && `bg-gradient-to-br ${getColor(name)} text-white font-semibold`,
        'flex items-center justify-center',
        sizeClasses[size],
        className,
      )}>
        {src
          ? <img src={src} alt={name ?? 'avatar'} className="h-full w-full object-cover" />
          : <span>{getInitials(name)}</span>
        }
      </div>
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-white',
          onlineSizes[size],
          online ? 'bg-success' : 'bg-text-subtle',
        )} />
      )}
    </div>
  )
}
