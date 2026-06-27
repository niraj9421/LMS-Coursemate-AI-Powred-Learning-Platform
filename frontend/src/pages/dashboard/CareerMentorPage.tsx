import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Input'
import { Progress } from '@/components/ui/Progress'
import { Tabs } from '@/components/ui/Tabs'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface CareerPath {
  role: string; matchPercentage: number; whyGoodFit?: string
  skillGaps: string[]; recommendedCourses: string[]
  recommendedCertifications: string[]; recommendedProjects: string[]
}
interface RoadmapTask { week: number; task: string; type: string }
interface SalaryInsight { role: string; minSalary: string; maxSalary: string; currency: string }
interface Snapshot {
  careerReadinessScore: number; placementReadinessScore: number
  topCareerPath: string; careerPaths: CareerPath[]
  roadmap: Array<{ phase: string; tasks: RoadmapTask[] }>
  insights: string[]; salaryInsights: SalaryInsight[]
  generatedAt: string; isStale: boolean
  interests: string[]; targetRole: string; workPreference: string; timeline: string
}

// ─── Interests chips ──────────────────────────────────────────────────────────
const INTEREST_OPTIONS = [
  'Web Development', 'Mobile Development', 'Artificial Intelligence',
  'Machine Learning', 'Data Science', 'Cloud Computing', 'Cybersecurity',
  'DevOps', 'Blockchain', 'UI/UX Design', 'Product Management',
  'Open Source', 'Competitive Coding', 'System Design',
]

const TIMELINE_OPTIONS = [
  { id: '3months', label: '3 Months', sub: 'I need a job urgently' },
  { id: '6months', label: '6 Months', sub: 'Steady pace' },
  { id: '1year',   label: '1 Year',   sub: 'Building deep expertise' },
]

const WORK_OPTIONS = [
  { id: 'remote', label: '🏠 Remote',  },
  { id: 'hybrid', label: '🏢 Hybrid',  },
  { id: 'onsite', label: '🏙 On-site', },
]

// ─── Onboarding wizard ────────────────────────────────────────────────────────
interface WizardProps {
  onSubmit: (data: { interests: string[]; targetRole: string; workPreference: string; timeline: string; resumeText: string }) => void
  loading: boolean
  existing?: Snapshot | null
}

function SetupWizard({ onSubmit, loading, existing }: WizardProps) {
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState<string[]>(existing?.interests ?? [])
  const [targetRole, setTargetRole] = useState(existing?.targetRole ?? '')
  const [workPreference, setWorkPreference] = useState(existing?.workPreference ?? '')
  const [timeline, setTimeline] = useState(existing?.timeline ?? '6months')
  const [resumeText, setResumeText] = useState('')

  const toggleInterest = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const steps = [
    {
      title: 'What are you interested in?',
      sub: 'Select all topics that excite you — this helps AI personalise your path',
      content: (
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map(opt => (
            <button key={opt} onClick={() => toggleInterest(opt)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all ${
                interests.includes(opt)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-border text-text-muted hover:border-primary-400 hover:text-primary'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      ),
      valid: interests.length > 0,
    },
    {
      title: 'What role are you aiming for?',
      sub: 'Type a specific role, or leave blank and let AI suggest the best fit',
      content: (
        <div className="space-y-4">
          <Input
            label="Target Role (optional)"
            placeholder="e.g. Full Stack Developer, Data Scientist, Product Manager"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-text mb-2">Work Preference</p>
            <div className="flex gap-3">
              {WORK_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setWorkPreference(opt.id)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium border transition-all ${
                    workPreference === opt.id
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-border text-text-muted hover:border-primary-400'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: 'What is your timeline?',
      sub: 'How long do you have to prepare before you want to land a job?',
      content: (
        <div className="grid grid-cols-3 gap-3">
          {TIMELINE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setTimeline(opt.id)}
              className={`rounded-xl p-4 text-left border transition-all ${
                timeline === opt.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-border bg-surface text-text hover:border-primary-400'
              }`}>
              <p className="font-bold text-base mb-0.5">{opt.label}</p>
              <p className={`text-xs ${timeline === opt.id ? 'text-primary-100' : 'text-text-muted'}`}>{opt.sub}</p>
            </button>
          ))}
        </div>
      ),
      valid: !!timeline,
    },
    {
      title: 'Paste your resume (optional)',
      sub: 'Adding your resume text gives AI much richer context for analysis',
      content: (
        <Textarea
          label="Resume text (copy-paste from your resume)"
          placeholder="Paste your resume content here... Skills, experience, education, projects — the more detail, the better the analysis."
          value={resumeText}
          onChange={e => setResumeText(e.target.value)}
          rows={10}
        />
      ),
      valid: true,
    },
  ]

  const current = steps[step]!
  const isLast = step === steps.length - 1

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'flex-1 bg-primary-600' : 'w-8 bg-border'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-text mb-1">{current.title}</h2>
            <p className="text-sm text-text-muted">{current.sub}</p>
          </div>
          {current.content}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
        <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          ← Back
        </Button>
        <span className="text-xs text-text-muted">Step {step + 1} of {steps.length}</span>
        {isLast ? (
          <Button variant="primary" loading={loading} onClick={() => onSubmit({ interests, targetRole, workPreference, timeline, resumeText })}>
            🤖 Generate My Career Path
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setStep(s => s + 1)} disabled={!current.valid}>
            Continue →
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CareerMentorPage() {
  const { user, loading } = useRequireAuth()
  const qc = useQueryClient()
  const [showWizard, setShowWizard] = useState(false)
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['career-mentor'],
    queryFn: async () => {
      const res = await api.get<{ data: Snapshot | null }>('/career-mentor')
      return res.data.data
    },
    enabled: !!user,
  })

  const generateMutation = useMutation({
    mutationFn: (payload: { interests: string[]; targetRole: string; workPreference: string; timeline: string; resumeText: string }) =>
      api.post<{ data: Snapshot }>('/career-mentor/generate', payload),
    onSuccess: res => {
      toast.success('Career roadmap ready!')
      // Set both query cache AND invalidate to force a fresh fetch that updates snapshot
      qc.setQueryData(['career-mentor'], res.data.data)
      qc.invalidateQueries({ queryKey: ['career-mentor'] })
      setShowWizard(false)
      setActiveTab('overview')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'AI service unavailable. Please try again.', { duration: 5000 })
    },
  })

  if (loading || !user)
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  const tabs = [
    { id: 'overview',  label: '🎯 Overview'      },
    { id: 'paths',     label: '🗺 Career Paths'  },
    { id: 'roadmap',   label: '📅 Roadmap'       },
    { id: 'salary',    label: '💰 Salary'        },
    { id: 'insights',  label: '💡 Insights'      },
  ]

  const phaseColors: Record<string, string> = {
    '30d': 'bg-green-50 border-green-200 text-green-800',
    '60d': 'bg-blue-50 border-blue-200 text-blue-800',
    '90d': 'bg-purple-50 border-purple-200 text-purple-800',
  }
  const taskTypeIcon: Record<string, string> = { course: '📚', project: '🚀', practice: '💻', interview: '🎤', default: '✅' }

  // Show wizard if no snapshot yet OR user explicitly clicked Regenerate
  if ((!snapshot && !isLoading && !generateMutation.isPending) || showWizard) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="page-header mb-0">
              <h1 className="page-title">AI Career Mentor</h1>
              <p className="page-desc">Personalized career guidance powered by AI</p>
            </div>
            {snapshot && <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>← Back to results</Button>}
          </div>
          {generateMutation.isPending ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <div>
                  <p className="text-sm font-semibold text-text mb-1">Analyzing your profile…</p>
                  <p className="text-xs text-text-muted">Gemini AI is building your personalised career roadmap.</p>
                  <p className="text-xs text-text-subtle mt-1">This takes 15–30 seconds.</p>
                </div>
              </div>
            </Card>
          ) : (
            <SetupWizard
              onSubmit={data => generateMutation.mutate(data)}
              loading={generateMutation.isPending}
              existing={snapshot}
            />
          )}
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading)
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-secondary" />)}
        </div>
      </DashboardLayout>
    )

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">AI Career Mentor</h1>
            <p className="page-desc">Personalized career guidance powered by AI</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {snapshot?.generatedAt && (
              <p className="text-xs text-text-muted hidden sm:block">
                Updated {new Date(snapshot.generatedAt).toLocaleDateString()}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowWizard(true)}>
              🔄 Regenerate
            </Button>
          </div>
        </div>

        {/* What was analyzed banner */}
        {snapshot && (
          <Card className="p-4 bg-primary-50/50 border-primary-200">
            <p className="text-xs font-semibold text-primary-700 mb-2">📊 Analysis based on:</p>
            <div className="flex flex-wrap gap-1.5">
              {snapshot.interests?.length > 0 && snapshot.interests.map(i => (
                <span key={i} className="rounded-full bg-primary-100 border border-primary-300 px-2.5 py-0.5 text-xs text-primary-700">✓ {i}</span>
              ))}
              {snapshot.targetRole && (
                <span className="rounded-full bg-green-100 border border-green-300 px-2.5 py-0.5 text-xs text-green-700">🎯 {snapshot.targetRole}</span>
              )}
              {snapshot.workPreference && (
                <span className="rounded-full bg-blue-100 border border-blue-300 px-2.5 py-0.5 text-xs text-blue-700">
                  {snapshot.workPreference === 'remote' ? '🏠 Remote' : snapshot.workPreference === 'hybrid' ? '🏢 Hybrid' : '🏙 On-site'}
                </span>
              )}
              {snapshot.timeline && (
                <span className="rounded-full bg-purple-100 border border-purple-300 px-2.5 py-0.5 text-xs text-purple-700">
                  ⏱ {snapshot.timeline === '3months' ? '3-month plan' : snapshot.timeline === '6months' ? '6-month plan' : '1-year plan'}
                </span>
              )}
            </div>
          </Card>
        )}

        {/* Score cards */}
        {snapshot && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Career Readiness',    value: snapshot.careerReadinessScore ?? 0,    color: 'primary' as const },
              { label: 'Placement Readiness', value: snapshot.placementReadinessScore ?? 0, color: 'success' as const },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-text-secondary">{s.label}</span>
                  </div>
                  <div className="text-3xl font-bold text-text mb-3">
                    {s.value}<span className="text-lg text-text-muted">/100</span>
                  </div>
                  <Progress value={s.value} variant={s.color} size="md" animated />
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {snapshot && (
          <>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} variant="underline" />

            {/* No career paths — stale/empty snapshot */}
            {(!snapshot.careerPaths || snapshot.careerPaths.length === 0) && !isLoading && (
              <Card className="p-10 text-center">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="text-heading-sm text-text mb-2">Snapshot is incomplete</h3>
                <p className="text-body-md text-text-muted mb-4">Click Regenerate to build a fresh career roadmap.</p>
                <Button variant="primary" onClick={() => setShowWizard(true)}>🔄 Regenerate</Button>
              </Card>
            )}

            {/* ── Overview ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="p-5">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Top Recommended Career</p>
                  <p className="text-2xl font-bold text-primary-600">{snapshot.topCareerPath}</p>
                  {snapshot.careerPaths.find(p => p.role === snapshot.topCareerPath)?.whyGoodFit && (
                    <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                      {snapshot.careerPaths.find(p => p.role === snapshot.topCareerPath)?.whyGoodFit}
                    </p>
                  )}
                </Card>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {snapshot.careerPaths.slice(0, 3).map(path => (
                    <Card key={path.role} hover onClick={() => { setSelectedPath(path); setActiveTab('paths') }} className="p-4 cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-text">{path.role}</p>
                        <Badge variant={path.matchPercentage >= 70 ? 'success' : path.matchPercentage >= 40 ? 'warning' : 'danger'}>
                          {path.matchPercentage}%
                        </Badge>
                      </div>
                      <Progress value={path.matchPercentage} variant={path.matchPercentage >= 70 ? 'success' : path.matchPercentage >= 40 ? 'warning' : 'danger'} size="sm" />
                      <p className="text-xs text-text-muted mt-2">{path.skillGaps.length} skill gap{path.skillGaps.length !== 1 ? 's' : ''}</p>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Career Paths ─────────────────────────────────────── */}
            {activeTab === 'paths' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {snapshot.careerPaths.map(path => (
                  <Card key={path.role}
                    className={`p-5 cursor-pointer transition-all ${selectedPath?.role === path.role ? 'border-primary-500 ring-1 ring-primary-500' : ''}`}
                    onClick={() => setSelectedPath(selectedPath?.role === path.role ? null : path)}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-text">{path.role}</h3>
                      <div className="flex items-center gap-2">
                        <Progress value={path.matchPercentage} variant={path.matchPercentage >= 70 ? 'success' : 'warning'} size="sm" className="w-24" />
                        <span className="text-sm font-bold text-text">{path.matchPercentage}%</span>
                      </div>
                    </div>
                    {path.whyGoodFit && <p className="text-xs text-text-muted mb-2 italic">{path.whyGoodFit}</p>}
                    {selectedPath?.role === path.role && (
                      <div className="mt-3 pt-3 border-t border-border space-y-4">
                        {path.skillGaps.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-text-muted mb-2">⚠️ Skill Gaps</p>
                            <div className="flex flex-wrap gap-1.5">{path.skillGaps.map(s => <Badge key={s} variant="danger">{s}</Badge>)}</div>
                          </div>
                        )}
                        {path.recommendedCourses.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-text-muted mb-2">📚 Recommended Courses</p>
                            <ul className="space-y-1">{path.recommendedCourses.map(c => <li key={c} className="text-xs text-text-secondary flex gap-1.5"><span className="text-primary-500">→</span>{c}</li>)}</ul>
                          </div>
                        )}
                        {path.recommendedCertifications.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-text-muted mb-2">🏆 Certifications</p>
                            <ul className="space-y-1">{path.recommendedCertifications.map(c => <li key={c} className="text-xs text-text-secondary flex gap-1.5"><span className="text-yellow-500">→</span>{c}</li>)}</ul>
                          </div>
                        )}
                        {path.recommendedProjects.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-text-muted mb-2">🚀 Project Ideas</p>
                            <ul className="space-y-1">{path.recommendedProjects.map(p => <li key={p} className="text-xs text-text-secondary flex gap-1.5"><span className="text-green-500">→</span>{p}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </motion.div>
            )}

            {/* ── Roadmap ───────────────────────────────────────────── */}
            {activeTab === 'roadmap' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {snapshot.roadmap.map(phase => (
                  <Card key={phase.phase} className="p-5">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold mb-4 ${phaseColors[phase.phase] ?? 'bg-surface-secondary border-border text-text'}`}>
                      {phase.phase === '30d' ? '🟢 First 30 Days' : phase.phase === '60d' ? '🔵 30–60 Days' : '🟣 60–90 Days'}
                    </div>
                    <div className="space-y-2">
                      {phase.tasks.map((task, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg bg-surface-secondary p-3">
                          <span className="text-base shrink-0">{taskTypeIcon[task.type] ?? taskTypeIcon['default']}</span>
                          <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Week {task.week}</p>
                            <p className="text-sm text-text">{task.task}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}

            {/* ── Salary ───────────────────────────────────────────── */}
            {activeTab === 'salary' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {(snapshot.salaryInsights ?? []).length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-text-muted">No salary data — regenerate to include salary insights.</p>
                  </Card>
                ) : (
                  (snapshot.salaryInsights ?? []).map(s => (
                    <Card key={s.role} className="p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text">{s.role}</h3>
                        <div className="text-right">
                          <p className="text-lg font-bold text-success">{s.minSalary} – {s.maxSalary}</p>
                          <p className="text-xs text-text-muted">{s.currency === 'INR' ? 'Indian Market' : 'Global Market'}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </motion.div>
            )}

            {/* ── Insights ─────────────────────────────────────────── */}
            {activeTab === 'insights' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {(snapshot.insights ?? []).map((insight, i) => (
                  <Card key={i} className="p-4 flex gap-3">
                    <span className="text-2xl shrink-0">💡</span>
                    <p className="text-sm text-text-secondary leading-relaxed">{insight}</p>
                  </Card>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
