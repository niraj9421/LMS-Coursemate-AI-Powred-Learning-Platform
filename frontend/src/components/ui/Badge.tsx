import { cn } from '@/utils/cn'

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline'

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
  dot?: boolean
}

const variantClasses: Record<Variant, string> = {
  default:  'bg-surface-secondary text-text-secondary border border-border',
  primary:  'bg-primary-50 text-primary-700 border border-primary-200',
  success:  'bg-green-50 text-green-700 border border-green-200',
  warning:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  danger:   'bg-red-50 text-red-700 border border-red-200',
  info:     'bg-blue-50 text-blue-700 border border-blue-200',
  purple:   'bg-purple-50 text-purple-700 border border-purple-200',
  outline:  'bg-transparent text-text-secondary border border-border',
}

const dotColors: Record<Variant, string> = {
  default: 'bg-text-muted',
  primary: 'bg-primary-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  purple:  'bg-purple-600',
  outline: 'bg-text-muted',
}

export function Badge({ children, variant = 'default', className, dot = false }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      variantClasses[variant],
      className,
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}
