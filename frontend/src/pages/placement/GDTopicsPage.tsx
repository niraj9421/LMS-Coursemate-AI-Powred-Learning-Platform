import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface GDTopic {
  _id: string; title: string; category: string
  difficulty: 'easy' | 'medium' | 'hard'; description: string; keyPoints: string[]
}

interface GDFeedback {
  overallScore: number; contentScore: number; clarityScore: number; confidenceScore: number
  keyPointsCovered: string[]; keyPointsMissed: string[]
  strengths: string[]; improvements: string[]
  overallFeedback: string; vocabularySuggestions: string[]
}

const DIFF_BORDER: Record<string, string> = {
  easy: 'border-l-4 border-l-success',
  medium: 'border-l-4 border-l-warning',
  hard: 'border-l-4 border-l-danger',
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => { const id = setTimeout(() => setDisplayed(value), 80); return () => clearTimeout(id) }, [value])
  return (
    <div>
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>{label}</span>
        <span className={`font-semibold ${value >= 70 ? 'text-success' : value >= 50 ? 'text-warning' : 'text-danger'}`}>{value}/100</span>
      </div>
      <Progress value={displayed} variant={value >= 70 ? 'success' : value >= 50 ? 'warning' : 'danger'} size="sm" />
    </div>
  )
}

// ─── Practice Panel (full-page side panel) ────────────────────────────────────
type PracticeStage = 'info' | 'recording' | 'review' | 'feedback'

function PracticePanel({
  topic,
  onClose,
}: {
  topic: GDTopic
  onClose: () => void
}) {
  const [stage, setStage] = useState<PracticeStage>('info')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState<GDFeedback | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef   = useRef<number>(0)

  // Check browser support
  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null
  const browserSupported = !!SpeechRecognitionAPI

  const feedbackMutation = useMutation({
    mutationFn: () =>
      api.post<{ data: GDFeedback }>(`/placement/gd-topics/${topic._id}/feedback`, {
        transcript,
        duration: elapsed,
      }),
    onSuccess: r => { setFeedback(r.data.data); setStage('feedback') },
    onError: () => toast.error('AI feedback failed — please try again'),
  })

  function startRecording() {
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = e as any
      let interim = ''
      let final = transcript
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += ' ' + t
        else interim = t
      }
      setTranscript(final.trim())
      setInterimText(interim)
    }

    recognition.onerror = (e: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (e as any).error
      if (err !== 'no-speech') toast.error(`Mic error: ${err}`)
    }

    recognition.start()
    recognitionRef.current = recognition
    setStage('recording')
    startTimeRef.current = Date.now()

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setInterimText('')
    setStage('review')
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative ml-auto w-full max-w-2xl h-full bg-surface flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant={topic.difficulty === 'easy' ? 'success' : topic.difficulty === 'hard' ? 'danger' : 'warning'} className="capitalize text-[10px]">
                {topic.difficulty}
              </Badge>
              <span className="text-xs text-text-muted">{topic.category}</span>
            </div>
            <h2 className="text-base font-bold text-text line-clamp-2">{topic.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text transition-colors p-1">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">

          {/* ── Stage: Info ──────────────────────────────────────── */}
          {(stage === 'info' || stage === 'recording' || stage === 'review') && (
            <>
              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">About This Topic</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{topic.description}</p>
              </div>

              {/* Key points */}
              <div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Key Points to Cover ({topic.keyPoints.length})
                </h3>
                <div className="space-y-2">
                  {topic.keyPoints.map((pt, i) => (
                    <div key={i} className="flex gap-2.5 rounded-lg bg-surface-secondary p-3">
                      <span className="text-primary-500 font-bold text-xs shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-text-secondary">{pt}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">💡 GD Tips</p>
                <ul className="space-y-1 text-xs text-amber-700">
                  <li>• Start with a brief intro of your stance</li>
                  <li>• Cover at least 3–4 key points with examples</li>
                  <li>• Conclude with a clear summary</li>
                  <li>• Speak at a steady pace — not too fast</li>
                </ul>
              </div>
            </>
          )}

          {/* ── Stage: Recording live transcript ─────────────────── */}
          {stage === 'recording' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Live Transcript</h3>
                <span className="flex items-center gap-1.5 text-xs font-mono text-danger">
                  <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                  {fmtTime(elapsed)}
                </span>
              </div>
              <div className="min-h-28 rounded-xl bg-surface-secondary border border-border p-3 text-sm text-text-secondary leading-relaxed">
                {transcript || <span className="text-text-subtle italic">Start speaking…</span>}
                {interimText && <span className="text-text-subtle italic"> {interimText}</span>}
              </div>
            </div>
          )}

          {/* ── Stage: Review transcript ──────────────────────────── */}
          {stage === 'review' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Your Speech Transcript</h3>
                <span className="text-xs text-text-muted">⏱ {fmtTime(elapsed)} spoken</span>
              </div>
              <textarea
                className="w-full min-h-36 rounded-xl bg-surface-secondary border border-border p-3 text-sm text-text-secondary leading-relaxed resize-y outline-none focus:border-primary-400"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Your speech transcript appears here. You can edit it before submitting for AI feedback."
              />
              <p className="text-xs text-text-muted mt-1.5">You can edit the transcript to fix any recognition errors before getting feedback.</p>
            </div>
          )}

          {/* ── Stage: Feedback ───────────────────────────────────── */}
          {stage === 'feedback' && feedback && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Overall score */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className={`text-5xl font-bold ${feedback.overallScore >= 70 ? 'text-success' : feedback.overallScore >= 50 ? 'text-warning' : 'text-danger'}`}>
                    {feedback.overallScore}
                    <span className="text-2xl text-text-muted">/100</span>
                  </div>
                  <p className="text-sm font-medium text-text">
                    {feedback.overallScore >= 70 ? '🎉 Excellent GD Performance!' : feedback.overallScore >= 50 ? '👍 Good Attempt!' : '📚 Keep Practicing!'}
                  </p>
                  <p className="text-xs text-text-muted">⏱ Spoke for {fmtTime(elapsed)}</p>
                </div>

                {/* Score bars */}
                <Card className="p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Score Breakdown</h3>
                  <ScoreBar label="Content Quality"  value={feedback.contentScore}    />
                  <ScoreBar label="Clarity & Flow"   value={feedback.clarityScore}    />
                  <ScoreBar label="Confidence"       value={feedback.confidenceScore} />
                </Card>

                {/* Overall feedback */}
                <div className="rounded-xl bg-surface-secondary p-4">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Overall Feedback</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{feedback.overallFeedback}</p>
                </div>

                {/* Key points covered / missed */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                    <p className="text-xs font-semibold text-success mb-2">✅ Points Covered ({feedback.keyPointsCovered.length})</p>
                    {feedback.keyPointsCovered.length === 0
                      ? <p className="text-xs text-text-muted">None detected</p>
                      : <ul className="space-y-1">{feedback.keyPointsCovered.map((p, i) => <li key={i} className="text-xs text-text-secondary">• {p}</li>)}</ul>
                    }
                  </div>
                  <div className="rounded-xl bg-danger/5 border border-danger/20 p-3">
                    <p className="text-xs font-semibold text-danger mb-2">⚠️ Points Missed ({feedback.keyPointsMissed.length})</p>
                    {feedback.keyPointsMissed.length === 0
                      ? <p className="text-xs text-text-muted">All covered!</p>
                      : <ul className="space-y-1">{feedback.keyPointsMissed.map((p, i) => <li key={i} className="text-xs text-text-secondary">• {p}</li>)}</ul>
                    }
                  </div>
                </div>

                {/* Strengths */}
                {feedback.strengths.length > 0 && (
                  <Card className="p-4">
                    <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2">💪 Strengths</p>
                    <ul className="space-y-1.5">
                      {feedback.strengths.map((s, i) => <li key={i} className="text-sm text-text-secondary flex gap-2"><span className="text-success shrink-0">→</span>{s}</li>)}
                    </ul>
                  </Card>
                )}

                {/* Improvements */}
                {feedback.improvements.length > 0 && (
                  <Card className="p-4">
                    <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">🔧 Areas to Improve</p>
                    <ul className="space-y-1.5">
                      {feedback.improvements.map((s, i) => <li key={i} className="text-sm text-text-secondary flex gap-2"><span className="text-warning shrink-0">→</span>{s}</li>)}
                    </ul>
                  </Card>
                )}

                {/* Vocabulary */}
                {feedback.vocabularySuggestions.length > 0 && (
                  <Card className="p-4">
                    <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">📖 Vocabulary Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {feedback.vocabularySuggestions.map(v => (
                        <span key={v} className="rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-xs text-primary-700">{v}</span>
                      ))}
                    </div>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-border px-6 py-4 bg-surface">
          {stage === 'info' && (
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
              {browserSupported ? (
                <Button variant="primary" fullWidth onClick={startRecording}>
                  🎙 Start Recording
                </Button>
              ) : (
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-warning text-center">⚠ Voice not supported in this browser. Type your speech below and get AI feedback.</p>
                  <Button variant="primary" fullWidth onClick={() => setStage('review')}>
                    ✏ Type Your Speech Instead
                  </Button>
                </div>
              )}
            </div>
          )}

          {stage === 'recording' && (
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 text-xs text-text-muted">
                <span className="h-2 w-2 rounded-full bg-danger animate-pulse shrink-0" />
                Recording… speak clearly into your microphone
              </div>
              <Button variant="danger" onClick={stopRecording}>⏹ Stop & Review</Button>
            </div>
          )}

          {stage === 'review' && (
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setStage('info'); setTranscript(''); setElapsed(0) }}>
                ↩ Re-record
              </Button>
              <Button
                variant="primary" fullWidth
                loading={feedbackMutation.isPending}
                disabled={!transcript.trim()}
                onClick={() => feedbackMutation.mutate()}
              >
                {feedbackMutation.isPending ? 'Getting AI Feedback…' : '🤖 Get AI Feedback'}
              </Button>
            </div>
          )}

          {stage === 'feedback' && (
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={onClose}>Done</Button>
              <Button variant="primary" fullWidth onClick={() => {
                setStage('info'); setTranscript(''); setElapsed(0); setFeedback(null)
              }}>
                🔄 Try Again
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GDTopicsPage() {
  const { user, loading } = useRequireAuth()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [practiceTopic, setPracticeTopic] = useState<GDTopic | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['gd-topics'],
    queryFn: async () => {
      const res = await api.get<{ data: { topics: GDTopic[] } }>('/placement/gd-topics')
      return res.data.data.topics
    },
    enabled: !!user,
  })

  const topics = data ?? []
  const categories = useMemo(() => Array.from(new Set(topics.map(t => t.category))), [topics])

  const filtered = useMemo(() => {
    let res = topics
    if (search.trim()) {
      const q = search.toLowerCase()
      res = res.filter(t => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    if (activeCategory) res = res.filter(t => t.category === activeCategory)
    return res
  }, [topics, search, activeCategory])

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl">
        <div className="page-header">
          <h1 className="page-title">GD Topics</h1>
          <p className="page-desc">Practice group discussions with AI-powered voice feedback</p>
        </div>

        {/* Search */}
        <Input
          placeholder="Search topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          }
        />

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === null ? 'bg-primary-600 text-white' : 'border border-border text-text-muted hover:bg-surface-secondary'}`}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-primary-600 text-white' : 'border border-border text-text-muted hover:bg-surface-secondary'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Topic grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton.Card key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-heading-sm text-text mb-2">No topics found</h3>
            <p className="text-body-md text-text-muted">
              {search || activeCategory ? 'Try a different search or category.' : 'Run the seed script to populate topics.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((topic, i) => (
              <motion.div key={topic._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`p-5 h-full flex flex-col ${DIFF_BORDER[topic.difficulty] ?? ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-text leading-snug">{topic.title}</h3>
                    <Badge
                      variant={topic.difficulty === 'easy' ? 'success' : topic.difficulty === 'hard' ? 'danger' : 'warning'}
                      className="capitalize shrink-0"
                    >
                      {topic.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mb-3 flex-1 line-clamp-2">{topic.description}</p>
                  {topic.keyPoints?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-text-secondary mb-1.5">Key Points</p>
                      <ul className="space-y-1">
                        {topic.keyPoints.slice(0, 3).map((pt, j) => (
                          <li key={j} className="flex gap-1.5 text-xs text-text-muted">
                            <span className="text-primary-500 shrink-0">•</span>{pt}
                          </li>
                        ))}
                        {topic.keyPoints.length > 3 && (
                          <li className="text-xs text-text-subtle">+{topic.keyPoints.length - 3} more…</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <Badge variant="default">{topic.category}</Badge>
                    <Button variant="primary" size="sm" onClick={() => setPracticeTopic(topic)}>
                      🎙 Practice
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Practice side panel */}
      <AnimatePresence>
        {practiceTopic && (
          <PracticePanel
            key={practiceTopic._id}
            topic={practiceTopic}
            onClose={() => setPracticeTopic(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
