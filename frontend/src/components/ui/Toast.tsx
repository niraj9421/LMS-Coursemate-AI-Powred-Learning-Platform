import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  id: string
  message: string
  type?: ToastType
  duration?: number
  onDismiss: (id: string) => void
}

const typeClasses: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

/**
 * Task 18.7 — Toast with auto-dismiss and Framer Motion slide-in.
 */
export function Toast({ id, message, type = 'info', duration = 4000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur-md shadow-glass',
        typeClasses[type],
      )}
    >
      <span className="text-base font-bold">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </motion.div>
  )
}
