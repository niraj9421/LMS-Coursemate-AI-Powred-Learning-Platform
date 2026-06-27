import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  lines?: number
}

export function Skeleton({ className, rounded = 'md', lines }: SkeletonProps) {
  const roundedClass = {
    sm: 'rounded', md: 'rounded-md', lg: 'rounded-xl', full: 'rounded-full',
  }[rounded]

  if (lines && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i}
            className={cn(
              'h-4 skeleton',
              roundedClass,
              i === lines - 1 && 'w-3/4',
              className,
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('skeleton', roundedClass, className)} aria-hidden="true" />
  )
}

// Preset skeleton shapes
Skeleton.Text = ({ lines = 3 }: { lines?: number }) => <Skeleton lines={lines} className="h-4" />
Skeleton.Avatar = ({ size = 'md' }: { size?: 'sm'|'md'|'lg' }) => {
  const s = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }[size]
  return <Skeleton rounded="full" className={s} />
}
Skeleton.Card = () => (
  <div className="card p-5 space-y-4">
    <Skeleton className="h-40 w-full" rounded="lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
)
