import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/services/api'

interface Analytics {
  totalUsers: number; newUsers: number; totalCourses: number
  totalEnrollments: number; revenue: number
}

function StatCard({ icon, value, label, sub, color, delay }: { icon: string; value: string | number; label: string; sub: string; color: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${color}`}>{icon}</div>
        <div className="text-2xl font-bold text-text">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <div className="text-sm font-medium text-text-secondary">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">{sub}</div>
      </Card>
    </motion.div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, loading } = useRequireAuth('admin')

  const { data } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => { const res = await api.get<{ data: Analytics }>('/admin/analytics'); return res.data.data },
    enabled: user?.role === 'admin',
  })

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-surface"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  const stats = [
    { icon: '👥', value: data?.totalUsers ?? 0,        label: 'Total Users',    sub: `+${data?.newUsers ?? 0} this month`, color: 'bg-blue-100 text-blue-600',   delay: 0 },
    { icon: '📚', value: data?.totalCourses ?? 0,      label: 'Total Courses',  sub: 'All statuses',                       color: 'bg-purple-100 text-purple-600', delay: 0.06 },
    { icon: '🎓', value: data?.totalEnrollments ?? 0,  label: 'Enrollments',    sub: 'All time',                           color: 'bg-green-100 text-green-600',   delay: 0.12 },
    { icon: '💰', value: `$${data?.revenue ?? 0}`,     label: 'Revenue',        sub: 'All time',                           color: 'bg-yellow-100 text-yellow-600', delay: 0.18 },
  ]

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-lg text-text">Admin Dashboard</h1>
            <p className="text-body-md text-text-muted">Platform overview and management</p>
          </div>
          <Button variant="outline" size="sm" leftIcon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            onClick={() => window.open('/api/v1/admin/analytics/export', '_blank')}>
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Manage Users',       icon: '👥', path: '/admin/users',   desc: 'View, edit roles, deactivate accounts', color: 'bg-blue-50 text-blue-600' },
            { label: 'Manage Courses',     icon: '📚', path: '/admin/courses', desc: 'Review and moderate all courses',        color: 'bg-purple-50 text-purple-600' },
            { label: 'News & Categories',  icon: '📰', path: '/admin/news',    desc: 'Manage articles and categories',          color: 'bg-green-50 text-green-600' },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <Card hover onClick={() => navigate(item.path)} className="p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${item.color}`}>{item.icon}</div>
                <h3 className="text-heading-sm text-text mb-1">{item.label}</h3>
                <p className="text-body-sm text-text-muted">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
