import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Course {
  _id: string; title: string; thumbnail: string; status: string
  instructor: { name: string }; enrollmentCount: number; createdAt: string
}

export default function AdminCoursesPage() {
  const { user } = useRequireAuth('admin')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const res = await api.get<{ data: { courses: Course[] } }>('/admin/courses', { params: { limit: 100 } })
      return res.data.data.courses
    },
    enabled: user?.role === 'admin',
  })

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/admin/courses/${id}/status`, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['admin-courses'] }) },
    onError: () => toast.error('Failed to update status'),
  })

  const statusVariant = (s: string) => s === 'published' ? 'success' : s === 'draft' ? 'warning' : 'default'

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Manage Courses</h1>
            <p className="page-desc">{(data ?? []).length} total courses</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (data ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-body-md text-text-muted">No courses found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(data ?? []).map((course, i) => (
                <motion.div key={course._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors">
                  <img
                    src={course.thumbnail || `https://placehold.co/60x45/2563eb/ffffff?text=C`}
                    alt={course.title}
                    className="h-12 w-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text line-clamp-1">{course.title}</p>
                    <p className="text-xs text-text-muted">
                      {course.instructor?.name ?? 'Unknown'} · {course.enrollmentCount} students
                    </p>
                  </div>
                  <Badge variant={statusVariant(course.status) as 'success' | 'warning' | 'default'} className="capitalize shrink-0">
                    {course.status}
                  </Badge>
                  <select
                    value={course.status}
                    onChange={(e) => changeStatus.mutate({ id: course._id, status: e.target.value })}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
