import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface AnalysisResult {
  atsScore: number
  skillsFound: string[]
  skillsGap: string[]
  keywordSuggestions: string[]
  sectionFeedback: Record<string, string>
  overallFeedback: string
}

const ROLE_CHIPS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Scientist', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer',
]

function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0)

  // Start at 0, animate to real score after first paint
  useEffect(() => {
    const id = setTimeout(() => setDisplayed(score), 60)
    return () => clearTimeout(id)
  }, [score])

  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work'
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = circ * (displayed / 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="bold" fill={color}>{score}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#9ca3af">/100</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      <span className="text-xs text-text-muted">ATS Score</span>
    </div>
  )
}

export default function ResumeAnalyzerPage() {
  const { user, loading } = useRequireAuth()
  const [file, setFile] = useState<File | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      const fd = new FormData()
      fd.append('resume', file)
      if (targetRole.trim()) fd.append('targetRole', targetRole.trim())
      const res = await api.post<{ data: AnalysisResult }>('/ai/resume/analyze', fd)
      return res.data.data
    },
    onSuccess: data => {
      setResult(data)
      toast.success('Resume analyzed!')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (msg?.includes('503') || msg?.includes('AI service')) {
        toast.error('AI service busy. Please try again in a moment.')
      } else {
        toast.error(msg ?? 'Analysis failed')
      }
    },
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="page-title">AI Resume Analyzer</h1>
          <p className="page-desc">Get ATS score, skill gap analysis, and keyword suggestions powered by AI</p>
        </div>

        {/* Upload card */}
        <Card className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false)
              const dropped = e.dataTransfer.files[0]
              if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.docx'))) {
                setFile(dropped); setResult(null)
              } else {
                toast.error('Please upload a PDF or DOCX file')
              }
            }}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary-500 bg-primary-50'
                : file
                ? 'border-success bg-success/5'
                : 'border-border hover:border-primary-400 hover:bg-surface-secondary'
            }`}
            onClick={() => document.getElementById('resume-file-input')?.click()}
          >
            <input
              id="resume-file-input"
              type="file"
              aria-label="Upload resume file (PDF or DOCX)"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setFile(f); setResult(null) }
                e.target.value = ''
              }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">📄</div>
                <p className="text-sm font-semibold text-success">{file.name}</p>
                <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl mb-1">📋</div>
                <p className="text-sm font-medium text-text">Drop your resume here or click to browse</p>
                <p className="text-xs text-text-muted">Supports PDF and DOCX files</p>
              </div>
            )}
          </div>

          {/* Target role */}
          <div>
            <Input
              label="Target Role (optional)"
              placeholder="e.g. Frontend Developer, Data Scientist"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {ROLE_CHIPS.map(chip => (
                <button key={chip} onClick={() => setTargetRole(chip)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    targetRole === chip
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-border text-text-muted hover:bg-surface-secondary'
                  }`}>
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            loading={analyzeMutation.isPending}
            disabled={!file}
            onClick={() => analyzeMutation.mutate()}
          >
            {analyzeMutation.isPending ? 'Analyzing with AI…' : '🤖 Analyze Resume'}
          </Button>

          {analyzeMutation.isPending && (
            <p className="text-center text-xs text-text-muted animate-pulse">
              Extracting text and running AI analysis — this takes 15–30 seconds…
            </p>
          )}
        </Card>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* ATS Score */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreRing score={result.atsScore} />
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <h2 className="text-heading-sm text-text">Resume Analysis Complete</h2>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="text-xs text-text-muted">ATS Score:</span>
                      <span className={`text-sm font-bold ${
                        result.atsScore >= 75 ? 'text-success' : result.atsScore >= 50 ? 'text-warning' : 'text-danger'
                      }`}>{result.atsScore}/100</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{result.overallFeedback}</p>
                    {targetRole && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-xs font-medium text-primary-700">
                        🎯 Analyzed for: {targetRole}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Two-column: skills found + skill gaps */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-1.5">
                    <span>✅</span> Skills Found ({result.skillsFound.length})
                  </h3>
                  {result.skillsFound.length === 0 ? (
                    <p className="text-xs text-text-muted">No specific skills detected</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {result.skillsFound.map(s => (
                        <Badge key={s} variant="success">{s}</Badge>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-danger mb-3 flex items-center gap-1.5">
                    <span>⚠️</span> Skill Gaps ({result.skillsGap.length})
                  </h3>
                  {result.skillsGap.length === 0 ? (
                    <p className="text-xs text-text-muted">No major skill gaps found</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {result.skillsGap.map(s => (
                        <Badge key={s} variant="danger">{s}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Keyword suggestions */}
              {result.keywordSuggestions.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-text mb-3">
                    🔑 Keyword Suggestions
                  </h3>
                  <p className="text-xs text-text-muted mb-3">Add these keywords to improve your ATS score:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywordSuggestions.map(k => (
                      <span key={k} className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        + {k}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Section feedback */}
              {Object.keys(result.sectionFeedback ?? {}).length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-text mb-4">📝 Section Feedback</h3>
                  <div className="space-y-3">
                    {Object.entries(result.sectionFeedback).map(([section, feedback]) => (
                      <div key={section} className="rounded-xl bg-surface-secondary p-3">
                        <p className="text-xs font-semibold text-text capitalize mb-1">{section}</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{String(feedback)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Score breakdown bar */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-4">📊 Score Breakdown</h3>
                <div className="space-y-3">
                  {[
                    {
                      label: 'ATS Compatibility',
                      value: result.atsScore,
                      note: `${result.atsScore}/100`,
                    },
                    {
                      label: 'Skills Match',
                      // ratio of skills found vs (found + gaps), capped 0-100
                      value: result.skillsFound.length + result.skillsGap.length > 0
                        ? Math.round((result.skillsFound.length / (result.skillsFound.length + result.skillsGap.length)) * 100)
                        : 0,
                      note: `${result.skillsFound.length} of ${result.skillsFound.length + result.skillsGap.length} skills`,
                    },
                    {
                      label: 'Keyword Coverage',
                      // fewer missing keywords = better
                      value: result.keywordSuggestions.length === 0
                        ? 90
                        : Math.max(20, 100 - result.keywordSuggestions.length * 10),
                      note: result.keywordSuggestions.length === 0 ? 'Good' : `${result.keywordSuggestions.length} to add`,
                    },
                    {
                      label: 'Completeness',
                      // no skill gaps at all → high score
                      value: result.skillsGap.length === 0
                        ? 95
                        : Math.max(30, 100 - result.skillsGap.length * 8),
                      note: result.skillsGap.length === 0 ? 'Complete' : `${result.skillsGap.length} gaps`,
                    },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>{item.label}</span>
                        <span className="font-medium text-text">{item.note}</span>
                      </div>
                      <Progress
                        value={item.value}
                        variant={item.value >= 70 ? 'success' : item.value >= 45 ? 'warning' : 'danger'}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Analyze again */}
              <Button variant="ghost" fullWidth onClick={() => { setResult(null); setFile(null) }}>
                ↩ Analyze Another Resume
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
