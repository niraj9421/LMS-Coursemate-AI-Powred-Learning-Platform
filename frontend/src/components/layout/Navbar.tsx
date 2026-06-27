import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { toggleTheme } from '@/features/theme/themeSlice'
import { logoutUser } from '@/features/auth/authSlice'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/utils/cn'
import api from '@/services/api'

const navLinks = [
  { label: 'Courses',   href: '/courses' },
  { label: 'Community', href: '/dashboard/community' },
  { label: 'Placement', href: '/dashboard/placement' },
  { label: 'Coding',    href: '/dashboard/playground' },
]

export function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useAppSelector((s) => s.theme.theme)
  const user = useAppSelector((s) => s.auth.user)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Fetch real unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await api.get<{ data: { notifications: Array<{ isRead: boolean }>; pagination: { total: number } } }>('/notifications', { params: { limit: 20 } })
      return res.data.data
    },
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const unreadCount = (notifData?.notifications ?? []).filter((n) => !n.isRead).length

  const handleLogout = async () => {
    setDropdownOpen(false)
    await dispatch(logoutUser())
    navigate('/login')
  }

  const dashboardPath = user?.role === 'admin'
    ? '/admin/dashboard'
    : user?.role === 'teacher'
    ? '/teacher/dashboard'
    : '/dashboard'

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-white/85 backdrop-blur-xl shadow-sm">
      <div className="container-app flex h-14 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <Logo size={28} showText />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'relative rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                isActive(link.href)
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-text-muted hover:bg-surface-secondary hover:text-text',
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary-600" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-text-muted hover:bg-surface-secondary hover:text-text transition-colors"
          >
            {theme === 'dark'
              ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            }
          </button>

          {/* Notification bell */}
          <button
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative rounded-lg p-2 text-text-muted hover:bg-surface-secondary hover:text-text transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-secondary transition-colors"
                aria-expanded={dropdownOpen}
              >
                <Avatar src={user.avatar} name={user.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-text leading-tight">{user.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-text-muted capitalize leading-tight">{user.role}</p>
                </div>
                <svg className="h-3 w-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1 w-52 rounded-xl border border-border bg-surface shadow-lg py-1"
                  >
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-sm font-medium text-text">{user.name}</p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                    {[
                      { label: 'Dashboard', href: dashboardPath, icon: '🏠' },
                      { label: 'My Profile', href: '/profile', icon: '👤' },
                      { label: 'Settings', href: '/settings', icon: '⚙️' },
                    ].map(item => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-secondary hover:text-text transition-colors"
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
                Get started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden rounded-lg p-2 text-text-muted hover:bg-surface-secondary transition-colors"
          >
            {menuOpen
              ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-surface overflow-hidden"
          >
            <div className="container-app py-3 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(link.href) ? 'bg-surface-secondary text-text' : 'text-text-muted hover:bg-surface-secondary hover:text-text',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <div className="flex gap-2 pt-2">
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center rounded-lg border border-border py-2 text-sm font-medium text-text-secondary">Sign in</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center rounded-lg bg-primary-600 py-2 text-sm font-medium text-white">Get started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
