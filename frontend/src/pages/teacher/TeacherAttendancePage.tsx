import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Progress } from '@/components/ui/Progress'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Course { _id: string; title: string }
interface AttendanceData {
  totalSessions: number
  totalStudents: number
  sessions: Array<{ id: string; title: string | null; date: string; presentCount: number }>
  studentStats: Array<{
    studentId: string; name: string; avatar?: string
    sessionsAttended: number; totalSessions: number; attendancePercentage: number
  }>
}
interface QRSession { session: { _id: string; sessionTitle?: string }; qrCode: string; expiresAt: string }

export default function TeacherAttendancePage() {
  const { user, loading } = useRequireAuth('teacher')
  const qc = useQueryClient()
  const [selectedCourse, setSelectedCourse] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [activeQR, setActiveQR] = useState<QRSession | null>(null)

  const { data: courses } = useQuery({
    queryKey: ['teacher-courses', user?._id],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Course[] } }>('/courses', {
        params: { instructor: user!._id, limit: 100 },
      })
      return res.data.data.items
    },
    enabled: !!user,
    onSuccess: d => { if (!selectedCourse && d.length > 0) setSelectedCourse(d[0]._id) },
  })

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['course-attendance', selectedCourse],
    queryFn: async () => {
      const res = await api.get<{ data: AttendanceData }>(`/attendance/${selectedCourse}`)
      return res.data.data
    },
    enabled: !!selectedCourse,
  })

  const createSession = useMutation({
    mutationFn: () => api.post<{ data: QRSession }>('/attendance/session', {
      courseId: selectedCourse,
      sessionTitle: sessionTitle.trim() || undefined,
    }),
    onSuccess: r => {
      setActiveQR(r.data.data)
      setSessionTitle('')
      qc.invalidateQueries({ queryKey: ['course-attendance', selectedCourse] })
    },
    onError: () => toast.error('Failed to create session'),
  })

  const handleExport = async () => {
    try {
      const res = await api.get(`/attendance/${selectedCourse}/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a'); a.href = url
      a.download = `attendance-${selectedCourse}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Export failed') }
  }

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  return (
    <DashboardLayout role="teacher">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Attendance</h1>
            <p className="page-desc">Track student attendance with QR code sessions</p>
          </div>
          {selectedCourse && attendance && attendance.totalSessions > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExport}>
              ⬇ Export CSV
            </Button>
          )}
        </div>

        {/* Course selector */}
        <Card className="p-4">
          <label className="text-sm font-medium text-text block mb-2">Select Course</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary-500">
            <option value="">— Choose a course —</option>
            {(courses ?? []).map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </Card>

        {selectedCourse && (
          <>
            {/* Start new session */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text mb-3">Start New Session</h3>
              <div className="flex gap-3">
                <Input
                  placeholder="Session title (optional, e.g. Week 3 - Lecture)"
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  className="flex-1"
                />
                <Button variant="primary" loading={createSession.isPending}
                  onClick={() => createSession.mutate()}>
                  Generate QR
                </Button>
              </div>
            </Card>

            {/* Stats */}
            {attendanceLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : attendance && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Sessions', value: attendance.totalSessions, icon: '📅' },
                    { label: 'Students',        value: attendance.totalStudents, icon: '👥' },
                    {
                      label: 'Avg Attendance',
                      value: attendance.studentStats.length > 0
                        ? `${Math.round(attendance.studentStats.reduce((s, st) => s + st.attendancePercentage, 0) / attendance.studentStats.length)}%`
                        : '—',
                      icon: '📈',
                    },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <Card className="p-4 text-center">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-xl font-bold text-text">{stat.value}</div>
                        <div className="text-xs text-text-muted">{stat.label}</div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Session history */}
                {attendance.sessions.length > 0 && (
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-text mb-3">Session History</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {attendance.sessions.map((session, i) => (
                        <div key={session.id} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">
                            {session.title ?? `Session ${i + 1}`}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-text-muted">
                              {new Date(session.date).toLocaleDateString()}
                            </span>
                            <Badge variant="primary">{session.presentCount} present</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Per-student attendance */}
                {attendance.studentStats.length > 0 && (
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-text mb-4">Student Attendance</h3>
                    <div className="space-y-3">
                      {attendance.studentStats.map((student, i) => (
                        <motion.div key={student.studentId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3">
                          <Avatar name={student.name} src={student.avatar} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">{student.name}</p>
                            <p className="text-xs text-text-muted">
                              {student.sessionsAttended}/{student.totalSessions} sessions
                            </p>
                          </div>
                          <div className="w-24">
                            <Progress
                              value={student.attendancePercentage}
                              variant={student.attendancePercentage >= 75 ? 'success' : student.attendancePercentage >= 50 ? 'warning' : 'danger'}
                              size="sm"
                            />
                          </div>
                          <span className={`text-xs font-semibold w-10 text-right ${
                            student.attendancePercentage >= 75 ? 'text-success' :
                            student.attendancePercentage >= 50 ? 'text-warning' : 'text-danger'
                          }`}>
                            {student.attendancePercentage}%
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                )}

                {attendance.totalSessions === 0 && (
                  <Card className="p-12 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-text-muted">No sessions yet. Generate a QR code above to start tracking attendance.</p>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {!selectedCourse && (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-text-muted">Select a course to manage attendance.</p>
          </Card>
        )}
      </div>

      {/* QR code modal */}
      <Modal open={!!activeQR} onClose={() => setActiveQR(null)}
        title="Attendance Session Active"
        description="Students scan this QR to mark attendance. Expires in 15 minutes.">
        {activeQR && (
          <div className="space-y-4 text-center">
            <img src={activeQR.qrCode} alt="QR Code" className="mx-auto w-64 h-64 rounded-xl" />
            <p className="text-xs text-text-muted">
              Session: <span className="font-medium text-text">{activeQR.session.sessionTitle ?? 'Untitled'}</span>
            </p>
            <p className="text-xs text-text-muted">
              Expires: {new Date(activeQR.expiresAt).toLocaleTimeString()}
            </p>
            <Button variant="primary" fullWidth onClick={() => setActiveQR(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
