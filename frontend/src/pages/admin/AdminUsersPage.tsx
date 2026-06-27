import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface User { _id: string; name: string; email: string; role: string; avatar: string; createdAt: string }

export default function AdminUsersPage() {
  const { user } = useRequireAuth('admin')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      const res = await api.get<{ data: { users: User[]; total: number } }>('/admin/users', {
        params: { search: search || undefined, role: roleFilter !== 'all' ? roleFilter : undefined, limit: 50 },
      })
      return res.data.data
    },
    enabled: user?.role === 'admin',
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: () => toast.error('Failed to update role'),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: () => toast.error('Failed to delete user'),
  })

  const roleVariant: Record<string, 'danger'|'info'|'default'> = { admin: 'danger', teacher: 'info', student: 'default' }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Manage Users</h1>
            <p className="page-desc">{data?.total ?? 0} total users</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input placeholder="Search by name or email..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <div className="flex gap-1.5">
            {['all', 'student', 'teacher', 'admin'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-all ${roleFilter === r ? 'bg-primary-600 text-white' : 'border border-border bg-surface text-text-muted hover:bg-surface-secondary'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {(data?.users ?? []).map((u, i) => (
                <motion.div key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors">
                  <Avatar src={u.avatar} name={u.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{u.name}</p>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </div>
                  <Badge variant={roleVariant[u.role] ?? 'default'} className="capitalize shrink-0">{u.role}</Badge>
                  <select value={u.role}
                    onChange={(e) => changeRole.mutate({ id: u._id, role: e.target.value })}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-primary-500">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteUser.mutate(u._id) }}
                    className="rounded-lg p-1.5 text-text-subtle hover:bg-red-50 hover:text-danger transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </motion.div>
              ))}
              {(data?.users ?? []).length === 0 && (
                <div className="px-4 py-12 text-center text-body-md text-text-muted">No users found</div>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
