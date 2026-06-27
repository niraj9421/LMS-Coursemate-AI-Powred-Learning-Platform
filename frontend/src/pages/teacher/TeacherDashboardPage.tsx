import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Icons } from '@/components/ui/Icons'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Course {
  _id: string; title: string; thumbnail: string; status: string
  enrollmentCount: number; rating: { average: number }; totalLessons: number
}

export default function TeacherDashboardPage() {
  const navigate = useNavigate()
  const { user, loading } = useRequireAuth('teacher')
  const qc = useQueryClient()

  // Fetch only THIS teacher's courses by passing instructor param
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-courses', user?._id],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Course[] } }>('/courses', {
        params: { instructor: user!._id, limit: 100 },
      })
      return res.data.data.items
    },
    enabled: !!user,
  })

  const publishMutation = useMutation({
    mutationFn: (courseId: string) => api.post(`/courses/${courseId}/publish`),
    onSuccess: () => {
      toast.success('Course published! It is now visible to students.')
      qc.invalidateQueries({ queryKey: ['teacher-courses'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Could not publish. Add at least one chapter first.')
    },
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const courses = data ?? []
  const published    = courses.filter(c => c.status === 'published').length
  const drafts       = courses.filter(c => c.status === 'draft').length
  const totalStudents = courses.reduce((s, c) => s + c.enrollmentCount, 0)
  const avgRating    = courses.length > 0
    ? (courses.reduce((s, c) => s + c.rating.average, 0) / courses.length).toFixed(1)
    : '—'

  const stats = [
    { label: 'Total Courses',  value: courses.length, icon: <Icons.BookOpen className="h-5 w-5" />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Published',      value: published,       icon: <Icons.Check className="h-5 w-5" />,    color: 'bg-green-50 text-green-600' },
    { label: 'Drafts',         value: drafts,          icon: <Icons.Edit className="h-5 w-5" />,     color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Students', value: totalStudents,   icon: <Icons.Users className="h-5 w-5" />,   color: 'bg-purple-50 text-purple-600' },
    { label: 'Avg Rating',     value: avgRating,       icon: <Icons.Star className="h-5 w-5" />,    color: 'bg-yellow-50 text-yellow-600' },
  ]

  const statusVariant: Record<string, 'success' | 'warning' | 'default'> = {
    published: 'success', draft: 'warning', archived: 'default',
  }

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-lg text-text">Teacher Dashboard</h1>
            <p className="text-body-md text-text-muted">Welcome back, {user.name}</p>
          </div>
          <Button
            variant="primary" size="sm"
            onClick={() => navigate('/teacher/courses/new')}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Course
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
                <div className="text-xl font-bold text-text">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                <div className="text-xs text-text-muted">{s.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Analytics',   icon: <Icons.ChartBar className="h-6 w-6" />,       path: '/teacher/analytics' },
            { label: 'Assignments', icon: <Icons.FileText className="h-6 w-6" />,        path: '/teacher/assignments' },
            { label: 'Attendance',  icon: <Icons.Calendar className="h-6 w-6" />,        path: '/teacher/attendance' },
            { label: 'Community',   icon: <Icons.Chat className="h-6 w-6" />,            path: '/dashboard/community' },
          ].map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
              <Card hover onClick={() => navigate(action.path)} className="p-4 text-center cursor-pointer">
                <div className="flex justify-center mb-1.5 text-primary-600">{action.icon}</div>
                <p className="text-xs font-medium text-text">{action.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Course list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-sm text-text">My Courses</h2>
            <span className="text-xs text-text-muted">{courses.length} total · {courses.filter(c => c.status === 'draft').length} draft</span>
          </div>

          {courses.some(c => c.status === 'draft') && (
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 flex items-center gap-2">
              <Icons.Info className="h-4 w-4 shrink-0" />
              Draft courses are not visible to students. Click <strong>Publish</strong> to make them live.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : courses.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="text-4xl mb-3">📚</div>
              <h3 className="text-heading-sm text-text mb-2">No courses yet</h3>
              <p className="text-body-md text-text-muted mb-5">Create your first course to start teaching</p>
              <Button variant="primary" onClick={() => navigate('/teacher/courses/new')}>
                Create Your First Course
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {courses.map((course, i) => (
                <motion.div key={course._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <Card className="flex items-center gap-4 p-4">
                    <img
                      src={course.thumbnail || `https://placehold.co/80x60/2563eb/ffffff?text=C`}
                      alt="" className="h-12 w-16 rounded-lg object-cover shrink-0 cursor-pointer"
                      onClick={() => navigate(`/teacher/courses/${course._id}/edit`)}
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/teacher/courses/${course._id}/edit`)}>
                      <p className="text-sm font-medium text-text line-clamp-1">{course.title}</p>
                      <p className="text-xs text-text-muted">
                        {course.enrollmentCount} students · {course.totalLessons} lessons · ★ {course.rating.average.toFixed(1)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[course.status] ?? 'default'} className="capitalize shrink-0">
                      {course.status}
                    </Badge>
                    <div className="flex gap-1.5 shrink-0">
                      {course.status === 'draft' && (
                        <Button variant="primary" size="xs"
                          loading={publishMutation.isPending}
                          onClick={e => { e.stopPropagation(); publishMutation.mutate(course._id) }}>
                          Publish
                        </Button>
                      )}
                      <Button variant="outline" size="xs"
                        onClick={e => { e.stopPropagation(); navigate(`/teacher/courses/${course._id}/students`) }}>
                        <Icons.Users className="h-3.5 w-3.5 mr-1" /> Students
                      </Button>
                      <Button variant="ghost" size="xs"
                        onClick={e => { e.stopPropagation(); navigate(`/teacher/courses/${course._id}/edit`) }}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="xs"
                        onClick={e => { e.stopPropagation(); navigate(`/teacher/analytics?course=${course._id}`) }}>
                        <Icons.ChartBar className="h-3.5 w-3.5" />
                      </Button>
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
