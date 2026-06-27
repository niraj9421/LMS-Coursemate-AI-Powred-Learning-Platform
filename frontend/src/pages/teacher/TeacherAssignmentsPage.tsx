import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Course { _id: string; title: string }
interface Assignment {
  _id: string; title: string; description: string
  dueDate: string; maxMarks: number
  submissionCount: number; gradedCount: number
}
interface Submission {
  _id: string; grade: number | null; feedback: string
  submittedAt: string; fileUrl: string
  userId: { _id: string; name: string; email: string; avatar?: string }
}

export default function TeacherAssignmentsPage() {
  const { user, loading } = useRequireAuth('teacher')
  const qc = useQueryClient()
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null)
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', description: '', dueDate: '', maxMarks: '100' })

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

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['course-assignments', selectedCourse],
    queryFn: async () => {
      const res = await api.get<{ data: Assignment[] }>(`/assignments/course/${selectedCourse}`)
      return res.data.data
    },
    enabled: !!selectedCourse,
  })

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['assignment-submissions', selectedAssignment?._id],
    queryFn: async () => {
      const res = await api.get<{ data: Submission[] }>(`/assignments/${selectedAssignment!._id}/submissions`)
      return res.data.data
    },
    enabled: !!selectedAssignment,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/assignments', {
      courseId: selectedCourse,
      title: createForm.title,
      description: createForm.description,
      dueDate: createForm.dueDate,
      maxMarks: parseInt(createForm.maxMarks),
    }),
    onSuccess: () => {
      toast.success('Assignment created!')
      setShowCreateModal(false)
      setCreateForm({ title: '', description: '', dueDate: '', maxMarks: '100' })
      qc.invalidateQueries({ queryKey: ['course-assignments', selectedCourse] })
    },
    onError: () => toast.error('Failed to create assignment'),
  })

  const gradeMutation = useMutation({
    mutationFn: () => api.put(`/submissions/${gradingSubmission!._id}/grade`, {
      grade: parseInt(gradeForm.grade),
      feedback: gradeForm.feedback,
    }),
    onSuccess: () => {
      toast.success('Graded!')
      setGradingSubmission(null)
      qc.invalidateQueries({ queryKey: ['assignment-submissions', selectedAssignment?._id] })
      qc.invalidateQueries({ queryKey: ['course-assignments', selectedCourse] })
    },
    onError: () => toast.error('Failed to grade'),
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const pending = (submissions ?? []).filter(s => s.grade === null).length

  return (
    <DashboardLayout role="teacher">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Assignments</h1>
            <p className="page-desc">Create and grade student assignments</p>
          </div>
          {selectedCourse && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}
              leftIcon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
              New Assignment
            </Button>
          )}
        </div>

        {/* Course selector */}
        <Card className="p-4">
          <label className="text-sm font-medium text-text block mb-2">Select Course</label>
          <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedAssignment(null) }}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary-500">
            <option value="">— Choose a course —</option>
            {(courses ?? []).map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </Card>

        {/* Two-column: assignment list + submissions */}
        {selectedCourse && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Assignment list */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-text">Assignments</h2>
              {assignmentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : (assignments ?? []).length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm text-text-muted">No assignments yet. Create one above.</p>
                </Card>
              ) : (
                (assignments ?? []).map((a, i) => (
                  <motion.div key={a._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card
                      hover
                      className={`p-4 cursor-pointer transition-all ${selectedAssignment?._id === a._id ? 'ring-2 ring-primary-500' : ''}`}
                      onClick={() => setSelectedAssignment(a)}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <p className="text-sm font-medium text-text">{a.title}</p>
                        <Badge variant={a.submissionCount > a.gradedCount ? 'warning' : 'success'}>
                          {a.gradedCount}/{a.submissionCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-1 mb-2">{a.description}</p>
                      <div className="flex gap-3 text-xs text-text-subtle">
                        <span>📅 Due {new Date(a.dueDate).toLocaleDateString()}</span>
                        <span>🏆 {a.maxMarks} marks</span>
                        {a.submissionCount > a.gradedCount && (
                          <span className="text-warning font-medium">{a.submissionCount - a.gradedCount} pending</span>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            {/* Submissions panel */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-text">
                {selectedAssignment ? `Submissions — ${selectedAssignment.title}` : 'Select an assignment'}
              </h2>
              {!selectedAssignment ? (
                <Card className="p-8 text-center">
                  <div className="text-3xl mb-2">👆</div>
                  <p className="text-sm text-text-muted">Click an assignment to view submissions</p>
                </Card>
              ) : submissionsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (submissions ?? []).length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-text-muted">No submissions yet</p>
                </Card>
              ) : (
                <>
                  {pending > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 text-xs font-medium text-warning">
                      ⏳ {pending} submission{pending > 1 ? 's' : ''} pending grading
                    </div>
                  )}
                  {(submissions ?? []).map((sub, i) => (
                    <motion.div key={sub._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="p-4 flex items-center gap-3">
                        <Avatar name={sub.userId.name} src={sub.userId.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text">{sub.userId.name}</p>
                          <p className="text-xs text-text-muted">
                            Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                          </p>
                          {sub.fileUrl && (
                            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:underline">📎 View file</a>
                          )}
                        </div>
                        {sub.grade !== null ? (
                          <div className="text-right">
                            <span className={`text-sm font-bold ${sub.grade >= selectedAssignment.maxMarks * 0.6 ? 'text-success' : 'text-danger'}`}>
                              {sub.grade}/{selectedAssignment.maxMarks}
                            </span>
                            <p className="text-xs text-text-muted">Graded</p>
                          </div>
                        ) : (
                          <Button variant="primary" size="xs" onClick={() => {
                            setGradingSubmission(sub)
                            setGradeForm({ grade: '', feedback: '' })
                          }}>
                            Grade
                          </Button>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create assignment modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}
        title="New Assignment" description="Create an assignment for your students">
        <div className="space-y-4">
          <Input label="Title" placeholder="e.g. Build a REST API" value={createForm.title}
            onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" placeholder="Describe the assignment requirements..."
            value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" type="date" value={createForm.dueDate}
              onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Max Marks" type="number" min="1" value={createForm.maxMarks}
              onChange={e => setCreateForm(f => ({ ...f, maxMarks: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" loading={createMutation.isPending}
              disabled={!createForm.title || !createForm.description || !createForm.dueDate}
              onClick={() => createMutation.mutate()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Grade modal */}
      <Modal open={!!gradingSubmission} onClose={() => setGradingSubmission(null)}
        title={`Grade — ${gradingSubmission?.userId.name}`}
        description={`Max marks: ${selectedAssignment?.maxMarks}`}>
        {gradingSubmission && (
          <div className="space-y-4">
            <Input label="Grade" type="number" min="0" max={selectedAssignment?.maxMarks}
              value={gradeForm.grade} onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))}
              placeholder={`0 – ${selectedAssignment?.maxMarks}`} />
            <Textarea label="Feedback (optional)" value={gradeForm.feedback}
              onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))}
              placeholder="Great work! Consider improving..." rows={3} />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setGradingSubmission(null)}>Cancel</Button>
              <Button variant="primary" loading={gradeMutation.isPending}
                disabled={!gradeForm.grade} onClick={() => gradeMutation.mutate()}>
                Submit Grade
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
