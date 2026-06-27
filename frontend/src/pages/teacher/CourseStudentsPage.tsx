import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'

interface StudentEntry {
  enrollment: { _id: string; progress: number; status: string; enrolledAt: string; lastAccessedAt: string; completedLessons: number }
  student: { _id: string; name: string; email: string; avatar?: string; gamification: { xp: number; level: number } }
}

interface CourseStudentsData {
  course: { title: string; enrollmentCount: number }
  students: StudentEntry[]
}

export default function CourseStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user, loading } = useRequireAuth('teacher')

  const { data, isLoading } = useQuery({
    queryKey: ['course-students', courseId],
    queryFn: async () => {
      const res = await api.get<{ data: CourseStudentsData }>(`/users/course/${courseId}/students`)
      return res.data.data
    },
    enabled: !!user && !!courseId,
  })

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  const statusVariant: Record<string, 'success' | 'primary' | 'default'> = {
    completed: 'success', active: 'primary', dropped: 'default',
  }

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/dashboard')}
            leftIcon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>}>
            Back
          </Button>
          <div className="page-header mb-0">
            <h1 className="page-title">{data?.course.title ?? 'Enrolled Students'}</h1>
            <p className="page-desc">{data?.course.enrollmentCount ?? 0} total enrollments</p>
          </div>
        </div>

        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Enrolled', value: data.students.length, icon: '👥' },
              { label: 'Completed', value: data.students.filter(s => s.enrollment.status === 'completed').length, icon: '✅' },
              { label: 'Avg Progress', value: `${Math.round(data.students.reduce((sum, s) => sum + s.enrollment.progress, 0) / (data.students.length || 1))}%`, icon: '📈' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="p-4 text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-xl font-bold text-text">{stat.value}</div>
                  <div className="text-xs text-text-muted">{stat.label}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Students table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (data?.students ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-3">👥</div>
              <h3 className="text-heading-sm text-text mb-2">No students enrolled yet</h3>
              <p className="text-body-md text-text-muted">Share your course link to get enrollments!</p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 bg-surface-secondary border-b border-border text-xs font-medium text-text-muted uppercase tracking-wider">
                <div className="col-span-4">Student</div>
                <div className="col-span-3">Progress</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Lessons</div>
                <div className="col-span-1">XP</div>
              </div>

              <div className="divide-y divide-border">
                {(data?.students ?? []).map((entry, i) => (
                  <motion.div key={entry.student._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-4 py-3.5 hover:bg-surface-secondary transition-colors items-center">

                    {/* Student */}
                    <div className="sm:col-span-4 flex items-center gap-3">
                      <Avatar src={entry.student.avatar} name={entry.student.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{entry.student.name}</p>
                        <p className="text-xs text-text-muted truncate">{entry.student.email}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <Progress value={entry.enrollment.progress}
                        variant={entry.enrollment.status === 'completed' ? 'success' : 'primary'}
                        size="sm" className="flex-1" />
                      <span className="text-xs font-medium text-text-muted shrink-0 w-8 text-right">
                        {entry.enrollment.progress}%
                      </span>
                    </div>

                    {/* Status */}
                    <div className="sm:col-span-2">
                      <Badge variant={statusVariant[entry.enrollment.status] ?? 'default'} className="capitalize">
                        {entry.enrollment.status}
                      </Badge>
                    </div>

                    {/* Completed lessons */}
                    <div className="sm:col-span-2">
                      <span className="text-sm font-medium text-text">{entry.enrollment.completedLessons}</span>
                      <span className="text-xs text-text-muted ml-1">done</span>
                    </div>

                    {/* XP */}
                    <div className="sm:col-span-1">
                      <span className="text-xs font-medium text-yellow-600">⚡ {entry.student.gamification?.xp ?? 0}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
