import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import api from '@/services/api'
import toast from 'react-hot-toast'

const CATEGORIES = ['quantitative', 'logical', 'verbal'] as const
type Category = typeof CATEGORIES[number]

const CAT_ICON: Record<Category, string> = { quantitative: '🔢', logical: '🧠', verbal: '📝' }

const TIME_LIMIT = 15 * 60   // 15 minutes in seconds

interface Question { _id: string; question: string; options: string[] }
interface TestResult {
  score: number; total: number; percentage: number
  results: Array<{ questionId: string; correct: boolean; correctAnswer: string }>
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function AptitudeTestPage() {
  const { user, loading } = useRequireAuth()
  const [category, setCategory] = useState<Category>('quantitative')
  const [started, setStarted]   = useState(false)
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [result, setResult]     = useState<TestResult | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [focusedQ, setFocusedQ] = useState<number>(0)
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])

  const { data: questions, isLoading } = useQuery({
    queryKey: ['aptitude', category],
    queryFn: async () => {
      const res = await api.get<{ data: { questions: Question[] } }>(`/placement/aptitude/${category}`)
      return res.data.data.questions
    },
    enabled: started && !!user,
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post<{ data: TestResult }>(`/placement/aptitude/${category}/submit`, { answers }),
    onSuccess: r => { setResult(r.data.data); setStarted(false) },
    onError: () => toast.error('Submission failed'),
  })

  // Countdown timer
  useEffect(() => {
    if (!started || result || !questions?.length) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { submitMutation.mutate(); clearInterval(timer); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, result, questions?.length])

  // Reset timer when starting
  useEffect(() => { if (started) setTimeLeft(TIME_LIMIT) }, [started])

  function scrollToQ(idx: number) {
    setFocusedQ(idx)
    questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  // ─── Results / Review screen ───────────────────────────────────────────────
  if (result) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="page-header"><h1 className="page-title">Test Complete</h1></div>

        <Card className="p-8 text-center">
          <div className="text-5xl mb-3">
            {result.percentage >= 70 ? '🎉' : result.percentage >= 50 ? '👍' : '📚'}
          </div>
          <div className="text-4xl font-bold text-text mb-1">{result.score}/{result.total}</div>
          <div className="text-2xl font-semibold mb-3" style={{
            color: result.percentage >= 70 ? '#22c55e' : result.percentage >= 50 ? '#f59e0b' : '#ef4444',
          }}>
            {result.percentage}%
          </div>
          <Progress value={result.percentage}
            variant={result.percentage >= 70 ? 'success' : result.percentage >= 50 ? 'warning' : 'danger'}
            size="md" className="mb-4" />
          <p className="text-text-muted text-sm capitalize">{category} aptitude test</p>
        </Card>

        {/* Per-question review */}
        {questions && result.results.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Question Review</h3>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const res = result.results.find(r => r.questionId === q._id)
                const userAns = answers[q._id] ?? '—'
                const isCorrect = res?.correct ?? false
                return (
                  <div key={q._id} className={`rounded-xl p-3 border ${isCorrect ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}>
                    <p className="text-xs font-medium text-text mb-2">
                      <span className="text-text-muted mr-1">{i + 1}.</span>{q.question}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className={isCorrect ? 'text-success' : 'text-danger'}>
                        Your answer: <strong>{userAns}</strong> {isCorrect ? '✓' : '✗'}
                      </span>
                      {!isCorrect && res?.correctAnswer && (
                        <span className="text-success">Correct: <strong>{res.correctAnswer}</strong></span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <Button variant="primary" fullWidth onClick={() => {
          setResult(null); setAnswers({}); setStarted(false)
        }}>
          Try Again
        </Button>
      </div>
    </DashboardLayout>
  )

  // ─── Setup screen ─────────────────────────────────────────────────────────
  if (!started) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="page-header">
          <h1 className="page-title">Aptitude Tests</h1>
          <p className="page-desc">Test your quantitative, logical, and verbal skills</p>
        </div>
        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-xl py-4 text-sm font-medium capitalize transition-all flex flex-col items-center gap-1.5 ${
                  category === c
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'border border-border bg-surface text-text-muted hover:bg-surface-secondary'
                }`}>
                <span className="text-2xl">{CAT_ICON[c]}</span>
                {c}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-surface-secondary p-4 text-center">
            <p className="text-sm font-medium text-text capitalize">{CAT_ICON[category]} {category} Reasoning</p>
            <p className="text-xs text-text-muted mt-1">20 questions · ⏱ 15 minute timer</p>
          </div>
          <Button variant="primary" fullWidth size="lg" onClick={() => setStarted(true)}>
            Start Test
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  )

  // ─── Active test screen ───────────────────────────────────────────────────
  const qs = questions ?? []
  const answered = Object.keys(answers).length
  const timerColor = timeLeft <= 60 ? 'text-danger' : timeLeft <= 180 ? 'text-warning' : 'text-text-muted'

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title mb-0 capitalize">{CAT_ICON[category]} {category} Test</h1>
            <p className="text-xs text-text-muted">{answered}/{qs.length} answered</p>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${timerColor}`}>
            ⏱ {fmtTime(timeLeft)}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl animate-pulse bg-surface-secondary" />
            ))}
          </div>
        ) : qs.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">🧮</div>
            <p className="text-text-muted">No questions for {category} yet.</p>
          </Card>
        ) : (
          <div className="flex gap-5">
            {/* Question navigation sidebar */}
            <div className="hidden sm:flex flex-col gap-1.5 w-10 shrink-0 pt-1">
              {qs.map((q, i) => {
                const isAnswered = !!answers[q._id]
                return (
                  <button key={q._id} onClick={() => scrollToQ(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                      i === focusedQ
                        ? 'ring-2 ring-primary-500'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-success text-white'
                        : 'border border-border bg-surface text-text-muted hover:bg-surface-secondary'
                    }`}>
                    {i + 1}
                  </button>
                )
              })}
            </div>

            {/* Questions */}
            <div className="flex-1 space-y-4">
              <Progress value={(answered / (qs.length || 1)) * 100} size="sm" variant="primary" />

              {qs.map((q, i) => (
                <motion.div key={q._id} ref={el => { questionRefs.current[i] = el }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className={`p-5 transition-all ${i === focusedQ ? 'ring-1 ring-primary-400' : ''}`}
                    onClick={() => setFocusedQ(i)}>
                    <p className="text-sm font-medium text-text mb-4">
                      <span className="text-primary-600 font-bold mr-2">{i + 1}.</span>{q.question}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <button key={oi} onClick={() => setAnswers(a => ({ ...a, [q._id]: opt }))}
                          className={`rounded-xl border px-4 py-2.5 text-sm text-left transition-all ${
                            answers[q._id] === opt
                              ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                              : 'border-border bg-surface text-text-secondary hover:bg-surface-secondary'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              ))}

              <Button variant="primary" fullWidth size="lg" loading={submitMutation.isPending}
                disabled={answered < qs.length}
                onClick={() => submitMutation.mutate()}>
                Submit Test ({answered}/{qs.length} answered)
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
