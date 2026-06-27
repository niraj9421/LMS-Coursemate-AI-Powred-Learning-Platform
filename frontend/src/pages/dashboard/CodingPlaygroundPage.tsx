import { useState, useEffect, lazy, Suspense } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAppSelector } from '@/app/hooks'
import { Navbar } from '@/components/layout/Navbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

// Lazy-load Monaco to prevent blocking
const Editor = lazy(() => import('@monaco-editor/react').then(m => ({ default: m.default })))

const LANGUAGES = [
  { id: 'javascript', label: 'JS' },
  { id: 'python',     label: 'Py' },
  { id: 'java',       label: 'Java' },
  { id: 'cpp',        label: 'C++' },
]

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Write your solution here
function solution(input) {
  // Your code
  return null;
}`,
  python: `# Write your solution here
def solution(input):
    # Your code
    pass`,
  java: `// Write your solution here
class Solution {
    public static void main(String[] args) {
        // Your code
    }
}`,
  cpp: `// Write your solution here
#include <bits/stdc++.h>
using namespace std;
int main() {
    // Your code
    return 0;
}`,
}

interface Problem {
  _id: string; title: string; slug: string; difficulty: string
  category: string[]; description: string; constraints: string
  examples: Array<{ input: string; output: string; explanation?: string }>
  starterCode: Array<{ language: string; code: string }>
  acceptanceRate: number; totalSubmissions: number
}

interface RunResult {
  results: Array<{ input: string; expectedOutput: string; actualOutput: string; passed: boolean; stderr?: string; runtime: number }>
  passed: number; total: number
}

interface Submission {
  status: string; runtime: number; testCasesPassed: number; testCasesTotal: number
  errorMessage?: string; aiReview?: { timeComplexity: string; spaceComplexity: string; suggestions: string[] }
}

const diffVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  easy: 'success', medium: 'warning', hard: 'danger',
}

export default function CodingPlaygroundPage() {
  const { user, loading } = useRequireAuth()
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(DEFAULT_CODE['javascript']!)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [activeTab, setActiveTab] = useState('description')
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null)
  const [diffFilter, setDiffFilter] = useState('all')
  const [showList, setShowList] = useState(true)

  const theme = useAppSelector((s) => s.theme.theme)

  const { data: problems, isLoading: problemsLoading } = useQuery({
    queryKey: ['coding-problems', diffFilter],
    queryFn: async () => {
      const res = await api.get<{ data: { problems: Problem[] } }>('/coding/problems', {
        params: { difficulty: diffFilter !== 'all' ? diffFilter : undefined, limit: 50 },
      })
      return res.data.data.problems
    },
  })

  // Auto-select first problem
  useEffect(() => {
    if (problems && problems.length > 0 && !selectedProblem) {
      setSelectedProblem((problems as Problem[])[0]!)
    }
  }, [problems]) // eslint-disable-line

  // Update code when problem or language changes
  useEffect(() => {
    if (selectedProblem) {
      const starter = selectedProblem.starterCode?.find(s => s.language === language)
      setCode(starter?.code ?? DEFAULT_CODE[language] ?? '')
    }
  }, [selectedProblem, language])

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProblem) throw new Error('No problem selected')
      const res = await api.post<{ data: RunResult }>('/coding/run', {
        problemId: selectedProblem._id, language, code,
      })
      return res.data.data
    },
    onSuccess: (data) => { setRunResult(data); setActiveTab('testcases') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      if (msg.includes('JUDGE0') || msg.includes('Configuration') || msg.includes('not configured')) {
        toast.error('⚠ Code execution requires JUDGE0_API_KEY in backend .env\nGet free key at rapidapi.com/judge0', { duration: 5000 })
      } else {
        toast.error(msg || 'Run failed')
      }
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProblem) throw new Error('No problem selected')
      const res = await api.post<{ data: Submission }>('/coding/submit', {
        problemId: selectedProblem._id, language, code,
      })
      return res.data.data
    },
    onSuccess: (data) => {
      setLastSubmission(data); setActiveTab('result')
      if (data.status === 'accepted') toast.success('🎉 Accepted! All test cases passed.')
      else toast.error(`✗ ${data.status.replace(/_/g, ' ')}`)
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed')
    },
  })

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  )

  const detailTabs = [
    { id: 'description', label: 'Problem' },
    { id: 'testcases', label: `Tests${runResult ? ` ${runResult.passed}/${runResult.total}` : ''}` },
    { id: 'result', label: 'Result' },
    { id: 'ai-review', label: '🤖 AI' },
  ]

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <Navbar />

      {/* Judge0 notice */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-1.5 text-xs text-yellow-700 text-center">
        ⚠ Code execution requires <strong>JUDGE0_API_KEY</strong> in backend .env — 
        get a free key at <a href="https://rapidapi.com/judge0-official/api/judge0-ce" target="_blank" rel="noopener noreferrer" className="underline font-medium">rapidapi.com/judge0</a>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Problem List Panel */}
        {showList && (
          <div className="w-56 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-text">Problems</span>
              <button onClick={() => setShowList(false)} className="text-text-subtle hover:text-text text-xs">×</button>
            </div>
            {/* Difficulty filter */}
            <div className="p-2 border-b border-border flex gap-1">
              {['all', 'easy', 'med', 'hard'].map((d, i) => {
                const actual = ['all', 'easy', 'medium', 'hard'][i]!
                return (
                  <button key={d} onClick={() => setDiffFilter(actual)}
                    className={`flex-1 rounded text-[10px] py-1 font-medium transition-all ${diffFilter === actual ? 'bg-primary-600 text-white' : 'bg-surface-secondary text-text-muted hover:bg-surface-tertiary'}`}>
                    {d}
                  </button>
                )
              })}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {problemsLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-3 py-2 border-b border-border">
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  ))
                : ((problems as Problem[]) ?? []).map((p: Problem, i: number) => (
                    <button key={p._id} onClick={() => { setSelectedProblem(p); setActiveTab('description') }}
                      className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors text-xs ${
                        selectedProblem?._id === p._id
                          ? 'bg-primary-50 border-l-2 border-l-primary-600'
                          : 'hover:bg-surface-secondary'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-subtle w-5 shrink-0">{i + 1}.</span>
                        <span className="text-text line-clamp-1 flex-1">{p.title}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 ml-6">
                        <Badge variant={diffVariant[p.difficulty] ?? 'default'} className="text-[9px] capitalize py-0">{p.difficulty}</Badge>
                        {p.acceptanceRate > 0 && <span className="text-[9px] text-text-muted">{p.acceptanceRate.toFixed(0)}%</span>}
                      </div>
                    </button>
                  ))
              }
            </div>
          </div>
        )}

        {/* Problem Detail Panel */}
        <div className="flex flex-col overflow-hidden border-r border-border" style={{ width: '35%', minWidth: 280 }}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-border bg-surface flex items-center gap-2">
            {!showList && (
              <button onClick={() => setShowList(true)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">☰ Problems</button>
            )}
            {selectedProblem ? (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text line-clamp-1">{selectedProblem.title}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant={diffVariant[selectedProblem.difficulty] ?? 'default'} className="text-[9px] capitalize py-0">{selectedProblem.difficulty}</Badge>
                  <span className="text-[9px] text-text-muted">{selectedProblem.acceptanceRate.toFixed(0)}% acceptance</span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-text-muted">Select a problem</span>
            )}
          </div>

          <Tabs tabs={detailTabs} active={activeTab} onChange={setActiveTab} variant="underline"
            className="px-2 shrink-0 [&_button]:text-xs [&_button]:px-2.5 [&_button]:py-2" />

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 text-xs">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && selectedProblem && (
                <motion.div key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="text-text-secondary leading-relaxed whitespace-pre-wrap">{selectedProblem.description}</div>
                  {selectedProblem.examples.map((ex, i) => (
                    <div key={i} className="rounded-lg bg-surface-secondary p-3">
                      <p className="font-semibold text-text mb-1">Example {i + 1}</p>
                      <p className="font-mono text-text-secondary">Input: <span className="text-text">{ex.input}</span></p>
                      <p className="font-mono text-text-secondary">Output: <span className="text-text">{ex.output}</span></p>
                      {ex.explanation && <p className="text-text-muted mt-1 italic">{ex.explanation}</p>}
                    </div>
                  ))}
                  {selectedProblem.constraints && (
                    <div className="rounded-lg border border-border p-3">
                      <p className="font-semibold text-text mb-1">Constraints</p>
                      <p className="font-mono text-text-secondary whitespace-pre-wrap">{selectedProblem.constraints}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'testcases' && runResult && (
                <motion.div key="tests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Progress value={(runResult.passed / runResult.total) * 100}
                      variant={runResult.passed === runResult.total ? 'success' : 'danger'} size="sm" className="flex-1" />
                    <span className={`font-semibold ${runResult.passed === runResult.total ? 'text-success' : 'text-danger'}`}>
                      {runResult.passed}/{runResult.total}
                    </span>
                  </div>
                  {runResult.results.map((r, i) => (
                    <div key={i} className={`rounded-lg border p-2.5 ${r.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <p className={`font-semibold mb-1.5 ${r.passed ? 'text-success' : 'text-danger'}`}>
                        {r.passed ? '✓ Pass' : '✗ Fail'} — Test {i + 1} ({r.runtime}ms)
                      </p>
                      <div className="font-mono space-y-0.5 text-text-secondary">
                        <p>Input: <span className="text-text">{r.input}</span></p>
                        <p>Expected: <span className="text-text">{r.expectedOutput}</span></p>
                        <p>Got: <span className={r.passed ? 'text-success' : 'text-danger'}>{r.actualOutput || '(empty)'}</span></p>
                      </div>
                      {r.stderr && <p className="text-danger mt-1 font-mono">{r.stderr}</p>}
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'result' && lastSubmission && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className={`rounded-xl p-4 mb-3 ${lastSubmission.status === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-base font-bold capitalize mb-1 ${lastSubmission.status === 'accepted' ? 'text-success' : 'text-danger'}`}>
                      {lastSubmission.status === 'accepted' ? '🎉 Accepted' : `✗ ${lastSubmission.status.replace(/_/g, ' ')}`}
                    </p>
                    <p className="text-text-secondary">{lastSubmission.testCasesPassed}/{lastSubmission.testCasesTotal} tests passed
                      {lastSubmission.runtime > 0 && ` · ${lastSubmission.runtime}ms`}
                    </p>
                  </div>
                  {lastSubmission.errorMessage && (
                    <div className="rounded-lg bg-surface-secondary p-3 font-mono text-danger whitespace-pre-wrap">{lastSubmission.errorMessage}</div>
                  )}
                </motion.div>
              )}

              {activeTab === 'ai-review' && (
                <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {lastSubmission?.aiReview ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Card className="p-3"><p className="text-text-muted mb-1">Time</p><p className="font-mono font-semibold text-text">{lastSubmission.aiReview.timeComplexity}</p></Card>
                        <Card className="p-3"><p className="text-text-muted mb-1">Space</p><p className="font-mono font-semibold text-text">{lastSubmission.aiReview.spaceComplexity}</p></Card>
                      </div>
                      <Card className="p-3">
                        <p className="font-semibold text-text mb-2">Suggestions</p>
                        <ul className="space-y-1">{(lastSubmission.aiReview.suggestions ?? []).map((s, i) => <li key={i} className="flex gap-1.5 text-text-secondary"><span className="text-primary-600">→</span>{s}</li>)}</ul>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-2xl mb-2">🤖</p>
                      <p className="text-text-muted">Submit a solution to get AI code review</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'description' && !selectedProblem && (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-3xl mb-2">👈</p>
                  <p>Select a problem from the list</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface shrink-0">
            <div className="flex gap-1">
              {LANGUAGES.map(l => (
                <button key={l.id} onClick={() => setLanguage(l.id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${language === l.id ? 'bg-primary-600 text-white' : 'bg-surface-secondary text-text-muted hover:bg-surface-tertiary'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="xs" loading={runMutation.isPending}
              disabled={!selectedProblem} onClick={() => runMutation.mutate()}>
              ▶ Run
            </Button>
            <Button variant="primary" size="xs" loading={submitMutation.isPending}
              disabled={!selectedProblem} onClick={() => submitMutation.mutate()}>
              Submit
            </Button>
          </div>

          {/* Monaco Editor — uses flex-1 to fill available height */}
          <div className="flex-1 overflow-hidden" aria-hidden="true" role="none">
            <Suspense fallback={
              <div className="h-full flex items-center justify-center bg-surface-secondary">
                <div className="text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto mb-2" />
                  <p className="text-xs text-text-muted">Loading editor...</p>
                </div>
              </div>
            }>
              <Editor
                height="100%"
                language={language === 'cpp' ? 'cpp' : language}
                value={code}
                onChange={(val) => setCode(val ?? '')}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 10, bottom: 10 },
                  fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                  wordWrap: 'on',
                  tabSize: 2,
                  automaticLayout: true,
                  scrollbar: { verticalScrollbarSize: 6 },
                }}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
