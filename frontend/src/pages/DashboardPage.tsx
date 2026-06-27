import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { fetchMe } from '@/features/auth/authSlice'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Progress } from '@/components/ui/Progress'
import { Icons } from '@/components/ui/Icons'
import api from '@/services/api'

interface Enrollment {
  _id: string
  courseId: { _id: string; title: string; thumbnail: string }
  progress: number
  status: string
}

function StatCard({ icon, label, value, color, delay }: { icon: React.ReactNode; label: string; value: string | number; color: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
          {icon}
        </div>
        <div className="text-2xl font-bold text-text mb-1">{value}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </Card>
    </motion.div>
  )
}

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)

  useEffect(() => {
    if (!user) dispatch(fetchMe()).then((r) => { if (fetchMe.rejected.match(r)) navigate('/login') })
  }, [user, dispatch, navigate])

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const res = await api.get<{ data: Enrollment[] }>('/users/me/enrollments')
      return res.data.data
    },
    enabled: !!user,
  })

  const { data: stats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: { xp: number; level: number; streak: number; rank: number } }>('/gamification/stats')
      return res.data.data
    },
    enabled: !!user,
  })

  const { data: codingStats } = useQuery({
    queryKey: ['coding-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: { totalSolved: number; currentStreak: number } }>('/coding/stats')
      return res.data.data
    },
    enabled: !!user,
  })

  if (!user) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  )

  const statCards = [
    { icon: <Icons.Zap className="h-5 w-5" />,    label: 'XP Points',       value: stats?.xp?.toLocaleString() ?? '0', color: 'bg-yellow-50 text-yellow-600', delay: 0 },
    { icon: <Icons.Star className="h-5 w-5" />,   label: 'Level',           value: stats?.level ?? 1,                  color: 'bg-purple-50 text-purple-600',  delay: 0.06 },
    { icon: <Icons.Fire className="h-5 w-5" />,   label: 'Day Streak',      value: stats?.streak ?? 0,                 color: 'bg-orange-50 text-orange-600',  delay: 0.12 },
    { icon: <Icons.Code className="h-5 w-5" />,   label: 'Problems Solved', value: codingStats?.totalSolved ?? 0,      color: 'bg-blue-50 text-blue-600',      delay: 0.18 },
  ]

  const active = (enrollments ?? []).filter(e => e.status === 'active')
  const completed = (enrollments ?? []).filter(e => e.status === 'completed')

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full">
        {/* Welcome banner */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 p-6 text-white flex items-center gap-5 shadow-lg">
          <Avatar src={user.avatar} name={user.name} size="xl" className="ring-4 ring-white/30 shadow-xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-0.5">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-primary-100 text-sm capitalize">{user.role} · {user.email}</p>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                <Icons.Check className="h-3 w-3" /> Active learner
              </span>
              {completed.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-green-400/20 px-2.5 py-0.5 text-xs font-medium text-green-200">{completed.length} course{completed.length > 1 ? 's' : ''} completed</span>}
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-right">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{stats?.level ?? 1}</p>
              <p className="text-xs text-primary-200">Level</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{stats?.streak ?? 0}</p>
              <p className="text-xs text-primary-200 flex items-center gap-1"><Icons.Fire className="h-3 w-3" /> Streak</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-heading-sm text-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {[
              { label: 'Browse Courses',  href: '/courses',                        icon: <Icons.BookOpen className="h-5 w-5" />,   color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',     border: 'border border-blue-100' },
              { label: 'Coding Practice', href: '/dashboard/playground',           icon: <Icons.Code className="h-5 w-5" />,       color: 'bg-green-50 hover:bg-green-100 text-green-700',  border: 'border border-green-100' },
              { label: 'AI Tutor',        href: '/dashboard/ai',                   icon: <Icons.Brain className="h-5 w-5" />,      color: 'bg-purple-50 hover:bg-purple-100 text-purple-700', border: 'border border-purple-100' },
              { label: 'Mock Interview',  href: '/dashboard/placement/interview',  icon: <Icons.Mic className="h-5 w-5" />,        color: 'bg-orange-50 hover:bg-orange-100 text-orange-700', border: 'border border-orange-100' },
              { label: 'Career Mentor',   href: '/dashboard/career',               icon: <Icons.Map className="h-5 w-5" />,        color: 'bg-teal-50 hover:bg-teal-100 text-teal-700',     border: 'border border-teal-100' },
              { label: 'Community',       href: '/dashboard/community',            icon: <Icons.Chat className="h-5 w-5" />,       color: 'bg-pink-50 hover:bg-pink-100 text-pink-700',     border: 'border border-pink-100' },
              { label: 'GD Practice',     href: '/dashboard/placement/gd-topics',  icon: <Icons.MessageCircle className="h-5 w-5" />, color: 'bg-amber-50 hover:bg-amber-100 text-amber-700', border: 'border border-amber-100' },
              { label: 'Live Chat',       href: '/dashboard/chat',                 icon: <Icons.Lightning className="h-5 w-5" />, color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700', border: 'border border-indigo-100' },
            ].map(a => (
              <button key={a.href} onClick={() => navigate(a.href)}
                className={`flex items-center gap-2.5 rounded-xl p-3.5 text-sm font-medium transition-all ${a.color} ${a.border}`}>
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* My Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-sm text-text">My Courses</h2>
            <button onClick={() => navigate('/courses')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Browse more →
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse bg-surface-secondary" />)}
            </div>
          ) : active.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="flex justify-center mb-3 text-text-subtle"><Icons.BookOpen className="h-12 w-12" /></div>
              <h3 className="text-heading-sm text-text mb-2">Start your learning journey</h3>
              <p className="text-body-md text-text-muted mb-5">Enroll in a course to begin tracking your progress</p>
              <button onClick={() => navigate('/courses')}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
                Explore Courses
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {active.map((e, i) => (
                <motion.div key={e._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card hover onClick={() => navigate(`/courses/${e.courseId._id}`)} className="p-4 flex gap-3">
                    <img src={e.courseId.thumbnail || `https://placehold.co/80x60/2563eb/ffffff?text=C`}
                      alt="" className="h-14 w-20 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text line-clamp-2 mb-2">{e.courseId.title}</p>
                      <Progress value={e.progress} size="sm" variant="primary" showValue />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
