import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Session {
  session: { _id: string; questions: Array<{ question: string; type?: string }> }
  firstQuestion: { question: string } | null
}
interface Evaluation { score: number; feedback: string; confidence: string }
interface AnswerResult {
  evaluation: Evaluation
  nextQuestion: { question: string } | null
  isComplete: boolean
  report: { overallScore: number; feedback: string; strengths: string[]; improvements: string[] } | null
}

const ROLE_CHIPS = ['Frontend Dev', 'Backend Dev', 'Full Stack', 'Data Scientist', 'DevOps', 'Product Manager']

const TYPE_BADGE: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'default' }> = {
  technical:     { label: 'Technical',   variant: 'primary'  },
  behavioral:    { label: 'Behavioral',  variant: 'success'  },
  situational:   { label: 'Situational', variant: 'warning'  },
  hr:            { label: 'HR',          variant: 'default'  },
  system_design: { label: 'System Design', variant: 'danger' },
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

// ─── Score gauge (SVG arc 0-100) ─────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const r = 52; const cx = 60; const cy = 60
  const circumference = Math.PI * r           // half-circle
  const offset = circumference * (1 - score / 100)
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="120" height="70" viewBox="0 0 120 70">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{score}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#9ca3af">/100</text>
    </svg>
  )
}

export default function MockInterviewPage() {
  const { user, loading } = useRequireAuth()
  const [role, setRole]   = useState('')
  const [type, setType]   = useState('technical')
  const [session, setSession] = useState<Session | null>(null)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null)
  const [report, setReport] = useState<AnswerResult['report'] | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [prevFeedbackOpen, setPrevFeedbackOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Elapsed timer during interview
  useEffect(() => {
    if (!session || report) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [session, report])

  const startMutation = useMutation({
    mutationFn: () => api.post<{ data: Session }>('/ai/interview/start', { role, type }),
    onSuccess: r => { setSession(r.data.data); setQuestionIdx(0); setElapsed(0) },
    onError:   () => toast.error('Failed to start. Check your GEMINI_API_KEY.'),
  })

  const answerMutation = useMutation({
    mutationFn: () =>
      api.post<{ data: AnswerResult }>(`/ai/interview/${session?.session._id}/answer`, {
        questionIndex: questionIdx, answer,
      }),
    onSuccess: r => {
      const d = r.data.data; setLastResult(d); setAnswer(''); setPrevFeedbackOpen(false)
      if (d.isComplete && d.report) setReport(d.report)
      else setQuestionIdx(i => i + 1)
    },
    onError: () => toast.error('Failed to submit answer'),
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const totalQ = session?.session.questions.length ?? 5
  const currentQuestion = session?.session.questions[questionIdx]
  const qType = currentQuestion ? ((currentQuestion as { type?: string }).type ?? type) : type
  const typeBadge = TYPE_BADGE[qType] ?? TYPE_BADGE['technical']!

  // ─── Results screen ────────────────────────────────────────────────────────
  if (report) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="page-header"><h1 className="page-title">Interview Complete!</h1></div>

        <Card className="p-6 text-center">
          <ScoreGauge score={report.overallScore} />
          <p className="text-text-muted text-sm mt-2">Overall Score</p>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-success mb-2">✅ Strengths</h3>
            <ul className="space-y-1">
              {report.strengths?.map((s, i) => <li key={i} className="text-xs text-text-secondary">• {s}</li>)}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-warning mb-2">🔧 Areas to Improve</h3>
            <ul className="space-y-1">
              {report.improvements?.map((s, i) => <li key={i} className="text-xs text-text-secondary">• {s}</li>)}
            </ul>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text mb-2">Overall Feedback</h3>
          <p className="text-sm text-text-secondary">{report.feedback}</p>
        </Card>

        <Button variant="primary" fullWidth onClick={() => {
          setSession(null); setReport(null); setLastResult(null); setElapsed(0)
        }}>
          Start New Interview
        </Button>
      </div>
    </DashboardLayout>
  )

  // ─── Main screen ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="page-title">Mock Interview</h1>
          <p className="page-desc">AI-powered interview practice</p>
        </motion.div>

        {/* Setup screen */}
        {!session ? (
          <Card className="p-6 space-y-5">
            <div>
              <Input label="Target Role" placeholder="e.g. Frontend Developer, Data Scientist"
                value={role} onChange={e => setRole(e.target.value)} />
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLE_CHIPS.map(chip => (
                  <button key={chip} onClick={() => setRole(chip)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                      role === chip
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-border text-text-muted hover:bg-surface-secondary'
                    }`}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text">Interview Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary-500">
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="behavioral">Behavioral</option>
                <option value="system_design">System Design</option>
              </select>
            </div>

            <Button variant="primary" fullWidth loading={startMutation.isPending}
              disabled={!role} onClick={() => startMutation.mutate()}>
              Start Interview
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Progress bar + timer */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted shrink-0">Q {questionIdx + 1} / {totalQ}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${(questionIdx / totalQ) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-text-muted shrink-0">⏱ {fmtTime(elapsed)}</span>
            </div>

            {/* Previous feedback collapsible */}
            <AnimatePresence>
              {lastResult?.evaluation && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Card className="p-4 border-success/20 bg-success/5">
                    <button onClick={() => setPrevFeedbackOpen(v => !v)}
                      className="flex w-full items-center justify-between text-xs font-medium text-success">
                      <span>Previous answer — {lastResult.evaluation.score}/100</span>
                      <span>{prevFeedbackOpen ? '▲' : '▼'}</span>
                    </button>
                    {prevFeedbackOpen && (
                      <p className="text-xs text-text-secondary mt-2">{lastResult.evaluation.feedback}</p>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Question card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
              </div>
              <p className="text-sm font-medium text-text leading-relaxed">{currentQuestion?.question}</p>
            </Card>

            <Textarea label="Your Answer" placeholder="Type your answer here..." rows={6}
              value={answer} onChange={e => setAnswer(e.target.value)} />

            <Button variant="primary" fullWidth loading={answerMutation.isPending}
              disabled={!answer.trim()} onClick={() => answerMutation.mutate()}>
              {questionIdx >= totalQ - 1 ? 'Submit & Get Report' : 'Next Question →'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
