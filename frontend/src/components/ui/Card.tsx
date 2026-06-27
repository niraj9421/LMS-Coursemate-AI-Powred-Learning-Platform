import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: boolean
  glass?: boolean
}

export function Card({ children, className, hover = false, onClick, padding = false, glass = false }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={onClick}
      className={cn(
        glass
          ? 'backdrop-blur-xl bg-white/80 border border-white/60 shadow-lg'
          : 'bg-surface border border-border',
        'rounded-2xl',
        !glass && 'shadow-[0_1px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
        hover && 'cursor-pointer',
        padding && 'p-5',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

// Compound sub-components
Card.Header = function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 pt-5 pb-4 border-b border-border', className)}>{children}</div>
}

Card.Body = function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

Card.Footer = function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-t border-border bg-surface-secondary rounded-b-xl', className)}>{children}</div>
}
