import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'

interface Snapshot {
  date: string; lessonsCompleted: number; quizzesTaken: number
  averageQuizScore: number; xpEarned: number; learningTime: number
}

interface AnalyticsResponse {
  dailySnapshots: Snapshot[]
  summary: { activeEnrollments: number; completedCourses: number; totalLearningTime: number; totalXpEarned: number }
}

interface Enrollment {
  _id: string
  courseId: { _id: string; title: string; thumbnail: string }
  progress: number; status: string
  completedLessons: string[]
}

export default function MyProgressPage() {
  const { user, loading } = useRequireAuth()
  const navigate = useNavigate()

  const { data: analyticsData, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['my-analytics'],
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsResponse }>('/users/me/analytics')
      return res.data.data
    },
    enabled: !!user,
  })

  const snapshots: Snapshot[] = Array.isArray(analyticsData)
    ? (analyticsData as unknown as Snapshot[])
    : (analyticsData?.dailySnapshots ?? [])

  const { data: enrollmentsRaw, isLoading: enrollLoading } = useQuery({
    queryKey: ['my-enrollments-progress'],
    queryFn: async () => {
      const res = await api.get<{ data: Enrollment[] | { enrollments?: Enrollment[] } }>('/users/me/enrollments')
      const d = res.data.data
      return Array.isArray(d) ? d : (d as { enrollments?: Enrollment[] }).enrollments ?? []
    },
    enabled: !!user,
  })
  const enrollments: Enrollment[] = Array.isArray(enrollmentsRaw) ? enrollmentsRaw : []

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  const totalLessonsFromEnrollments = enrollments.reduce((sum, e) => sum + (e.completedLessons?.length ?? 0), 0)

  const summaryStats = [
    { label: 'Lessons Done',  value: analyticsData?.summary?.totalLearningTime != null ? snapshots.reduce((s, d) => s + d.lessonsCompleted, 0) || totalLessonsFromEnrollments : totalLessonsFromEnrollments, icon: '📚', color: 'bg-blue-50 text-blue-600' },
    { label: 'Quizzes',       value: snapshots.reduce((s, d) => s + d.quizzesTaken, 0),                                             icon: '📝', color: 'bg-purple-50 text-purple-600' },
    { label: 'XP Earned',     value: analyticsData?.summary?.totalXpEarned ?? user.gamification?.xp ?? 0,                           icon: '⚡', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Hours Learned', value: Math.round((analyticsData?.summary?.totalLearningTime ?? snapshots.reduce((s,d)=>s+d.learningTime,0)) / 60), icon: '⏱', color: 'bg-green-50 text-green-600' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <div className="page-header">
          <h1 className="page-title">My Progress</h1>
          <p className="page-desc">Track your learning journey</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryStats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="p-5 text-center border-0 shadow-sm bg-gradient-to-br from-surface to-surface-secondary">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 mx-auto ${s.color}`}>{s.icon}</div>
                <div className="text-2xl font-bold text-text">{s.value}</div>
                <div className="text-xs text-text-muted mt-1">{s.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Two-column layout on wide screens */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-heading-sm text-text mb-4">Course Progress</h2>
          {enrollLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-body-md text-text-muted mb-4">No courses enrolled yet</p>
              <Button variant="primary" size="sm" onClick={() => navigate('/courses')}>Browse Courses</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((e, i) => (
                <motion.div key={e._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 cursor-pointer hover:bg-surface-secondary transition-colors"
                  onClick={() => navigate(`/courses/${e.courseId._id}`)}>
                  <img src={e.courseId.thumbnail || `https://placehold.co/60x45/2563eb/ffffff?text=C`}
                    alt="" className="h-12 w-16 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text line-clamp-1 mb-2">{e.courseId.title}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={e.progress} size="sm" variant={e.status === 'completed' ? 'success' : 'primary'} className="flex-1" />
                      <span className="text-xs font-medium text-text-muted shrink-0">{e.progress}%</span>
                    </div>
                  </div>
                  <Badge variant={e.status === 'completed' ? 'success' : 'primary'} className="capitalize shrink-0">{e.status}</Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Daily activity */}
        <Card className="p-5">
          <h2 className="text-heading-sm text-text mb-4">Daily Activity (Last 30 Days)</h2>
          {snapshotsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-body-sm text-text-muted">Start completing lessons to see your daily stats!</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              {[...snapshots].reverse().map((d, i) => (
                <motion.div key={d.date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 bg-surface hover:bg-surface-secondary transition-colors">
                  <span className="text-sm text-text-secondary w-24 shrink-0">
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex gap-5 text-xs text-text-muted">
                    <span>📚 <strong className="text-text">{d.lessonsCompleted}</strong></span>
                    <span>📝 <strong className="text-text">{d.quizzesTaken}</strong></span>
                    <span>⚡ <strong className="text-yellow-600">{d.xpEarned}</strong> XP</span>
                    <span>⏱ <strong className="text-green-600">{d.learningTime}</strong>m</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
        </div>{/* end two-col grid */}
      </div>
    </DashboardLayout>
  )
}
