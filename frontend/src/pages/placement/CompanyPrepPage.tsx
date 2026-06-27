import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

const POPULAR = ['Google', 'Microsoft', 'Amazon', 'Flipkart', 'Infosys', 'TCS', 'Wipro', 'Accenture']
const BOOKMARKS_KEY = 'lms_company_bookmarks'
const KIT_TABS = ['Questions', 'Skills', 'Tips', 'Process'] as const
type KitTab = typeof KIT_TABS[number]

interface CompanyQuestion { question: string; category: string }
interface CompanyKit {
  name: string; logo?: string
  commonQuestions: CompanyQuestion[]
  tips: string[]
  requiredSkills: string[]
  interviewProcess: string
}

interface PracticeQuestion { question: string; category: string }

function loadBookmarks(): string[] {
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]') } catch { return [] }
}
function saveBookmarks(bm: string[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bm))
}

export default function CompanyPrepPage() {
  const { user, loading } = useRequireAuth()
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState('')
  const [listTab, setListTab]     = useState<'popular' | 'bookmarked'>('popular')
  const [kitTab, setKitTab]       = useState<KitTab>('Questions')
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks)
  const [practiceQ, setPracticeQ] = useState<PracticeQuestion | null>(null)
  const [practiceAnswer, setPracticeAnswer] = useState('')

  useEffect(() => { saveBookmarks(bookmarks) }, [bookmarks])

  const { data, isLoading } = useQuery({
    queryKey: ['company-kit', selected],
    queryFn: async () => {
      const res = await api.get<{ data: CompanyKit }>(`/placement/company/${selected}`)
      return res.data.data
    },
    enabled: !!selected && !!user,
  })

  const aiFeedbackMutation = useMutation({
    mutationFn: () =>
      api.post<{ data: { answer: string } }>('/ai/tutor', {
        question: `Interview question: "${practiceQ?.question}"\n\nMy answer: "${practiceAnswer}"\n\nPlease give brief, honest feedback on this interview answer. What's good, what needs improvement?`,
      }),
    onSuccess: r => toast.success(r.data.data.answer.slice(0, 120) + '…'),
    onError:   () => toast.error('AI feedback failed'),
  })

  function toggleBookmark(name: string) {
    setBookmarks(bm =>
      bm.includes(name) ? bm.filter(b => b !== name) : [...bm, name]
    )
  }

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const displayCompanies = listTab === 'bookmarked' ? bookmarks : POPULAR

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl">
        <div className="page-header">
          <h1 className="page-title">Company Prep</h1>
          <p className="page-desc">Company-specific interview preparation kits</p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search company name..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && search) setSelected(search) }} />
          </div>
          <button onClick={() => { if (search) setSelected(search) }}
            className="rounded-xl bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
            Search
          </button>
        </div>

        {/* Popular / Bookmarked tabs */}
        <div className="flex items-center gap-3">
          {(['popular', 'bookmarked'] as const).map(tab => (
            <button key={tab} onClick={() => setListTab(tab)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-all ${
                listTab === tab ? 'bg-primary-600 text-white' : 'border border-border text-text-muted hover:bg-surface-secondary'
              }`}>
              {tab === 'bookmarked' ? `🔖 Bookmarked (${bookmarks.length})` : '⭐ Popular'}
            </button>
          ))}
        </div>

        {/* Company chips */}
        {displayCompanies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {displayCompanies.map(c => (
              <div key={c} className="flex items-center gap-1">
                <button onClick={() => setSelected(c)}
                  className={`rounded-l-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    selected === c ? 'bg-primary-600 text-white' : 'border border-r-0 border-border bg-surface text-text-muted hover:bg-surface-secondary'
                  }`}>
                  {c}
                </button>
                <button onClick={() => toggleBookmark(c)}
                  className={`rounded-r-full px-2 py-1.5 text-xs border transition-all ${
                    selected === c ? 'bg-primary-700 text-white border-primary-600' : 'border-border bg-surface text-text-muted hover:bg-surface-secondary'
                  }`}
                  title={bookmarks.includes(c) ? 'Remove bookmark' : 'Bookmark'}>
                  {bookmarks.includes(c) ? '🔖' : '☆'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">No bookmarks yet. Click ☆ next to a company to save it.</p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton.Card key={i} />)}
          </div>
        )}

        {/* Company kit */}
        {data && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Kit header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-2xl font-bold text-primary-600">
                  {data.name[0]}
                </div>
                <div>
                  <h2 className="text-heading-md text-text">{data.name}</h2>
                  <p className="text-body-sm text-text-muted">Interview Prep Kit</p>
                </div>
              </div>
              <button onClick={() => toggleBookmark(data.name)}
                className="flex items-center gap-1.5 text-xs font-medium text-text-muted border border-border rounded-xl px-3 py-1.5 hover:bg-surface-secondary transition-colors">
                {bookmarks.includes(data.name) ? '🔖 Bookmarked' : '☆ Bookmark'}
              </button>
            </div>

            {/* Kit tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {KIT_TABS.map(t => (
                <button key={t} onClick={() => setKitTab(t)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    kitTab === t ? 'bg-primary-600 text-white' : 'border border-border text-text-muted hover:bg-surface-secondary'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {kitTab === 'Questions' && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">❓ Common Questions</h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                  {(data.commonQuestions ?? []).map((q, i) => (
                    <div key={i} className="rounded-xl bg-surface-secondary p-3 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge variant="default" className="mb-1.5">{q.category}</Badge>
                        <p className="text-xs text-text-secondary">{q.question}</p>
                      </div>
                      <button onClick={() => { setPracticeQ(q); setPracticeAnswer('') }}
                        className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg px-2 py-1 transition-colors">
                        Practice
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {kitTab === 'Skills' && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">🛠 Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(data.requiredSkills ?? []).map(s => <Badge key={s} variant="primary">{s}</Badge>)}
                </div>
              </Card>
            )}

            {kitTab === 'Tips' && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">💡 Preparation Tips</h3>
                <ul className="space-y-2">
                  {(data.tips ?? []).map((t, i) => (
                    <li key={i} className="flex gap-2 text-xs text-text-secondary">
                      <span className="text-warning shrink-0">→</span>{t}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {kitTab === 'Process' && data.interviewProcess && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-2">📋 Interview Process</h3>
                <p className="text-body-sm text-text-secondary">{data.interviewProcess}</p>
              </Card>
            )}
          </motion.div>
        )}

        {selected && !data && !isLoading && (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-body-md text-text-muted">No prep kit found for "{selected}"</p>
          </Card>
        )}
      </div>

      {/* Practice Question Modal */}
      <Modal open={!!practiceQ} onClose={() => setPracticeQ(null)}
        title="Practice Question"
        description={practiceQ?.category ?? ''}>
        {practiceQ && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-secondary p-4">
              <p className="text-sm font-medium text-text">{practiceQ.question}</p>
            </div>
            <Textarea label="Your Answer" placeholder="Write your answer here..."
              value={practiceAnswer} onChange={e => setPracticeAnswer(e.target.value)} rows={5} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setPracticeQ(null)}>Close</Button>
              <Button variant="primary" loading={aiFeedbackMutation.isPending}
                disabled={!practiceAnswer.trim()} onClick={() => aiFeedbackMutation.mutate()}>
                ✨ Get AI Feedback
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
