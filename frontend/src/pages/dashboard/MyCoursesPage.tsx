import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import api from '@/services/api'

interface Enrollment {
  _id: string
  courseId: { _id: string; title: string; thumbnail: string; totalLessons: number }
  progress: number
  status: 'active' | 'completed' | 'dropped'
  enrolledAt: string
  completedLessons: string[]
}

const statusVariant: Record<string, 'success' | 'primary' | 'default'> = {
  completed: 'success', active: 'primary', dropped: 'default',
}

export default function MyCoursesPage() {
  const { user, loading } = useRequireAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const { data: enrollments, isLoading, isError } = useQuery({
    queryKey: ['my-enrollments-courses'],
    queryFn: async () => {
      const res = await api.get<{ data: Enrollment[] }>('/users/me/enrollments')
      return res.data.data
    },
    enabled: !!user,
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const all = enrollments ?? []
  const filtered = filter === 'all' ? all : all.filter(e => e.status === filter)

  const tabs = [
    { id: 'all',       label: `All (${all.length})` },
    { id: 'active',    label: `In Progress (${all.filter(e => e.status === 'active').length})` },
    { id: 'completed', label: `Completed (${all.filter(e => e.status === 'completed').length})` },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">My Courses</h1>
            <p className="page-desc">Track all your enrolled courses</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/courses')}>
            Browse More
          </Button>
        </div>

        <Tabs tabs={tabs} active={filter} onChange={setFilter} variant="pills" />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-24 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">😕</div>
            <h3 className="text-heading-sm text-text mb-2">Failed to load courses</h3>
            <p className="text-body-md text-text-muted mb-4">Please check your connection and try again.</p>
            <Button variant="primary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-5xl mb-3">📚</div>
            <h3 className="text-heading-sm text-text mb-2">
              {filter === 'all' ? 'No courses yet' : `No ${filter} courses`}
            </h3>
            <p className="text-body-md text-text-muted mb-5">
              {filter === 'all'
                ? 'Enroll in a course to start your learning journey'
                : `You have no ${filter} courses right now`}
            </p>
            {filter === 'all' && (
              <Button variant="primary" onClick={() => navigate('/courses')}>Explore Courses</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((e, i) => (
              <motion.div key={e._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card
                  hover
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => navigate(`/courses/${e.courseId._id}`)}
                >
                  <img
                    src={e.courseId.thumbnail || `https://placehold.co/96x64/2563eb/ffffff?text=C`}
                    alt={e.courseId.title}
                    className="h-16 w-24 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-text line-clamp-2 flex-1">{e.courseId.title}</p>
                      <Badge variant={statusVariant[e.status] ?? 'default'} className="capitalize shrink-0">
                        {e.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mb-2">
                      {e.completedLessons?.length ?? 0} / {e.courseId.totalLessons ?? '?'} lessons
                      · Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={e.progress}
                        variant={e.status === 'completed' ? 'success' : 'primary'}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="text-xs font-medium text-text-muted w-8 text-right shrink-0">
                        {e.progress}%
                      </span>
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-text-subtle shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
