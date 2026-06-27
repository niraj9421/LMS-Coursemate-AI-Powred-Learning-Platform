import { useEffect } from 'react'
import { useAppSelector } from '@/app/hooks'

/**
 * Task 18.2 — ThemeProvider
 * Reads theme from Redux store and applies/removes the `dark` class on <html>.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppSelector((s) => s.theme.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
