import { cn } from '@/utils/cn'
import { motion } from 'framer-motion'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pills' | 'boxed'
  className?: string
}

export function Tabs({ tabs, active, onChange, variant = 'underline', className }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-1 p-1 bg-surface-secondary rounded-xl w-fit', className)} role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              active === tab.id
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text',
            )}
          >
            {tab.icon && <span className="text-base">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                active === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-surface-tertiary text-text-muted',
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'boxed') {
    return (
      <div className={cn('flex gap-2', className)} role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-all',
              active === tab.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-surface text-text-muted border-border hover:bg-surface-secondary hover:text-text',
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  // underline (default)
  return (
    <div className={cn('relative flex border-b border-border', className)} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors',
            active === tab.id ? 'text-primary-600' : 'text-text-muted hover:text-text',
          )}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
              {tab.count}
            </span>
          )}
          {active === tab.id && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full"
            />
          )}
        </button>
      ))}
    </div>
  )
}
