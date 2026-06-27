import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  label?: string
  showValue?: boolean
  animated?: boolean
  className?: string
}

const sizeClasses = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
const variantClasses = {
  primary: 'bg-primary-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
}

export function Progress({ value, max = 100, size = 'md', variant = 'primary',
  label, showValue = false, animated = true, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
          {showValue && <span className="text-xs font-medium text-text-muted">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-surface-tertiary overflow-hidden', sizeClasses[size])}>
        <motion.div
          className={cn('h-full rounded-full', variantClasses[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
    </div>
  )
}
