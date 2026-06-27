import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'

interface Course { _id: string; title: string; enrollmentCount: number; rating: { average: number } }
interface CourseAnalytics {
  totalEnrollments: number
  activeStudents: number
  averageCompletionRate: number
  averageQuizScore: number
  lessonCompletionRates: Array<{ lessonId: string; completedCount: number; completionRate: number }>
}

export default function TeacherAnalyticsPage() {
  const { user, loading } = useRequireAuth('teacher')
  const [searchParams] = useSearchParams()
  const [selectedCourse, setSelectedCourse] = useState<string>(searchParams.get('course') ?? '')

  const { data: courses } = useQuery({
    queryKey: ['teacher-courses', user?._id],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Course[] } }>('/courses', {
        params: { instructor: user!._id, limit: 100 },
      })
      return res.data.data.items
    },
    enabled: !!user,
  })

  // v5 compatible: auto-select first course when loaded
  useEffect(() => {
    if (courses && courses.length > 0 && !selectedCourse) setSelectedCourse(courses[0]._id)
  }, [courses]) // eslint-disable-line

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['course-analytics', selectedCourse],
    queryFn: async () => {
      const res = await api.get<{ data: CourseAnalytics }>(`/courses/${selectedCourse}/analytics`)
      return res.data.data
    },
    enabled: !!selectedCourse,
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const selectedCourseObj = (courses ?? []).find(c => c._id === selectedCourse)

  return (
    <DashboardLayout role="teacher">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="page-title">Course Analytics</h1>
          <p className="page-desc">Track student engagement and performance across your courses</p>
        </div>

        {/* Course selector */}
        <Card className="p-4">
          <label className="text-sm font-medium text-text block mb-2">Select Course</label>
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary-500"
          >
            <option value="">— Choose a course —</option>
            {(courses ?? []).map(c => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
        </Card>

        {!selectedCourse && (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-text-muted">Select a course above to view its analytics.</p>
          </Card>
        )}

        {selectedCourse && (
          <>
            {analyticsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 space-y-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </Card>
                ))}
              </div>
            ) : analytics ? (
              <>
                {/* Summary stat cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Total Enrollments', value: analytics.totalEnrollments, icon: '👥', color: 'bg-blue-50 text-blue-600' },
                    { label: 'Active (7d)',        value: analytics.activeStudents,  icon: '🔥', color: 'bg-orange-50 text-orange-600' },
                    { label: 'Avg Completion',    value: `${analytics.averageCompletionRate}%`, icon: '📈', color: 'bg-green-50 text-green-600' },
                    { label: 'Avg Quiz Score',    value: `${analytics.averageQuizScore}%`,      icon: '🎯', color: 'bg-purple-50 text-purple-600' },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <Card className="p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 text-lg ${stat.color}`}>
                          {stat.icon}
                        </div>
                        <div className="text-xl font-bold text-text">{stat.value}</div>
                        <div className="text-xs text-text-muted">{stat.label}</div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bars */}
                <Card className="p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-text">Course Health</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-text-muted mb-1.5">
                        <span>Average Completion Rate</span>
                        <span>{analytics.averageCompletionRate}%</span>
                      </div>
                      <Progress value={analytics.averageCompletionRate}
                        variant={analytics.averageCompletionRate >= 70 ? 'success' : analytics.averageCompletionRate >= 40 ? 'warning' : 'danger'}
                        size="md" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-text-muted mb-1.5">
                        <span>Average Quiz Score</span>
                        <span>{analytics.averageQuizScore}%</span>
                      </div>
                      <Progress value={analytics.averageQuizScore}
                        variant={analytics.averageQuizScore >= 70 ? 'success' : analytics.averageQuizScore >= 40 ? 'warning' : 'danger'}
                        size="md" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-text-muted mb-1.5">
                        <span>Student Activity (7d)</span>
                        <span>{analytics.totalEnrollments > 0 ? Math.round((analytics.activeStudents / analytics.totalEnrollments) * 100) : 0}%</span>
                      </div>
                      <Progress
                        value={analytics.totalEnrollments > 0 ? (analytics.activeStudents / analytics.totalEnrollments) * 100 : 0}
                        variant="primary" size="md" />
                    </div>
                  </div>
                </Card>

                {/* Lesson completion table */}
                {analytics.lessonCompletionRates.length > 0 && (
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-text mb-4">Lesson Completion Rates</h3>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {analytics.lessonCompletionRates.map((lesson, i) => (
                        <div key={lesson.lessonId} className="flex items-center gap-3">
                          <span className="text-xs text-text-muted w-16 shrink-0">Lesson {i + 1}</span>
                          <Progress value={lesson.completionRate} variant="primary" size="sm" className="flex-1" />
                          <span className="text-xs font-medium text-text-muted w-10 text-right shrink-0">
                            {lesson.completionRate}%
                          </span>
                          <span className="text-xs text-text-subtle shrink-0">
                            ({lesson.completedCount})
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-12 text-center">
                <div className="text-4xl mb-3">😕</div>
                <p className="text-text-muted">No analytics data yet for "{selectedCourseObj?.title}".</p>
                <p className="text-xs text-text-subtle mt-1">Data appears once students enroll and engage.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
