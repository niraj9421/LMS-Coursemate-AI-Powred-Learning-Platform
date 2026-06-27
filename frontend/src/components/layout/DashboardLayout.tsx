import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { useAppSelector } from '@/app/hooks'
import { cn } from '@/utils/cn'

interface DashboardLayoutProps {
  children: React.ReactNode
  role?: 'student' | 'teacher' | 'admin'
  noPadding?: boolean
}

export function DashboardLayout({ children, role, noPadding = false }: DashboardLayoutProps) {
  const authUser = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const location = useLocation()
  const effectiveRole = (role ?? authUser?.role ?? 'student') as 'student' | 'teacher' | 'admin'

  // Auto-redirect teacher/admin who land on student-only routes
  useEffect(() => {
    if (!authUser) return
    const path = location.pathname

    // If no explicit role prop was passed and user is teacher/admin on a student route
    if (!role && authUser.role === 'teacher' && path.startsWith('/dashboard') && !path.startsWith('/dashboard/community') && !path.startsWith('/dashboard/chat')) {
      navigate('/teacher/dashboard', { replace: true })
      return
    }
    if (!role && authUser.role === 'admin' && path.startsWith('/dashboard')) {
      navigate('/admin/dashboard', { replace: true })
      return
    }
  }, [authUser, location.pathname, role, navigate])

  return (
    <div className="flex h-screen flex-col bg-surface-secondary text-text overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={effectiveRole} />
        <main
          id="main-content"
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin',
            !noPadding && 'px-6 py-6 lg:px-8',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
