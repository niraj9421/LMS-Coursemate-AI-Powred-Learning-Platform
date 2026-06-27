import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Icons } from '@/components/ui/Icons'
import api from '@/services/api'

interface PlacementProgress {
  resumeCompletion: number
  interviewsDone: number
  aptitudesDone: number
  overallScore: number
}

const features = [
  { icon: <Icons.FileText className="h-6 w-6" />, iconBg: 'bg-blue-50 text-blue-600',   title: 'Resume Builder',     desc: 'Build a professional resume and export as PDF.',             path: '/dashboard/placement/resume-builder',  tag: 'Popular' },
  { icon: <Icons.Sparkles className="h-6 w-6" />, iconBg: 'bg-violet-50 text-violet-600',title: 'AI Resume Analyzer', desc: 'ATS score, skill gap analysis, keyword suggestions.',        path: '/dashboard/placement/resume-analyzer', tag: 'AI' },
  { icon: <Icons.Mic className="h-6 w-6" />,      iconBg: 'bg-orange-50 text-orange-600',title: 'Mock Interviews',    desc: 'AI-powered role-specific interview practice.',               path: '/dashboard/placement/interview',       tag: 'AI' },
  { icon: <Icons.MessageCircle className="h-6 w-6" />, iconBg: 'bg-pink-50 text-pink-600', title: 'GD Topics',     desc: 'Curated group discussion topics with key talking points.',   path: '/dashboard/placement/gd-topics',       tag: null },
  { icon: <Icons.Calculator className="h-6 w-6" />,iconBg: 'bg-green-50 text-green-600', title: 'Aptitude Tests',    desc: 'Quantitative, logical, and verbal reasoning tests.',         path: '/dashboard/placement/aptitude',        tag: null },
  { icon: <Icons.Building className="h-6 w-6" />, iconBg: 'bg-amber-50 text-amber-600',  title: 'Company Prep',      desc: 'Company-specific interview questions, tips, and skills.',   path: '/dashboard/placement/companies',       tag: null },
]

export default function PlacementPage() {
  const { user, loading } = useRequireAuth()
  const navigate = useNavigate()

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['placement-progress'],
    queryFn: async () => {
      const res = await api.get<{ data: PlacementProgress }>('/placement/progress')
      return res.data.data
    },
    enabled: !!user,
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <div className="page-header">
          <h1 className="page-title">Placement Hub</h1>
          <p className="page-desc">Everything you need to land your dream job</p>
        </div>

        {/* ── Readiness card ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 bg-gradient-to-r from-primary-50 to-indigo-50 border-primary-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white"><Icons.Target className="h-5 w-5" /></div>
                <h2 className="text-base font-semibold text-text">Your Placement Readiness</h2>
              </div>
              {!progressLoading && progress && (
                <button onClick={() => navigate('/dashboard/placement/resume-builder')}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                  View Details →
                </button>
              )}
            </div>

            {progressLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : progress ? (
              <>
                <div className="space-y-4 mb-5">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-medium text-text-secondary flex items-center gap-1"><Icons.FileText className="h-3.5 w-3.5" /> Resume</span>
                      <span className="text-xs text-text-muted">{progress.resumeCompletion}%</span>
                    </div>
                    <Progress
                      value={progress.resumeCompletion}
                      variant={progress.resumeCompletion >= 70 ? 'success' : progress.resumeCompletion >= 40 ? 'warning' : 'danger'}
                      size="sm"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-medium text-text-secondary flex items-center gap-1"><Icons.Mic className="h-3.5 w-3.5" /> Mock Interviews</span>
                      <span className="text-xs text-text-muted">{progress.interviewsDone} done</span>
                    </div>
                    <Progress
                      value={Math.min((progress.interviewsDone / 5) * 100, 100)}
                      variant="primary"
                      size="sm"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-medium text-text-secondary flex items-center gap-1"><Icons.Calculator className="h-3.5 w-3.5" /> Aptitude Tests</span>
                      <span className="text-xs text-text-muted">{progress.aptitudesDone} done</span>
                    </div>
                    <Progress
                      value={Math.min((progress.aptitudesDone / 3) * 100, 100)}
                      variant="primary"
                      size="sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3">
                  <span className="text-xs text-text-muted">Overall Score</span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color:
                        progress.overallScore >= 70
                          ? 'var(--color-success)'
                          : progress.overallScore >= 40
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)',
                    }}
                  >
                    {progress.overallScore}%
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-text-muted">Start using the tools below to track your readiness.</p>
            )}
          </Card>
        </motion.div>

        {/* ── Feature cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card hover onClick={() => navigate(f.path)}
                className="p-5 h-full flex flex-col group transition-all hover:border-primary-300 hover:shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${f.iconBg}`}>
                    {f.icon}
                  </div>
                  {f.tag && (
                    <Badge variant={f.tag === 'AI' ? 'primary' : 'success'}>{f.tag}</Badge>
                  )}
                </div>
                <h3 className="text-sm font-bold text-text mb-2">{f.title}</h3>
                <p className="text-xs text-text-muted flex-1 leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary-600 group-hover:gap-2 transition-all">
                  Open <span>→</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
