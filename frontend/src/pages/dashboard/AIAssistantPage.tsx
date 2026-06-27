import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface TutorResponse {
  answer: string
  examples: string[]
  relatedTopics: string[]
  followUpQuestions: string[]
}

export default function AIAssistantPage() {
  const { user, loading } = useRequireAuth()
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<TutorResponse | null>(null)
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([])

  const askMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: TutorResponse }>('/ai/tutor', { question, history })
      return res.data.data
    },
    onSuccess: (data) => {
      setResponse(data)
      setHistory(h => [...h, { role: 'user', content: question }, { role: 'assistant', content: data.answer }])
      setQuestion('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (msg?.includes('429')) toast.error('Daily AI query limit reached. Try again tomorrow.')
      else if (msg?.includes('503') || msg?.includes('AI service')) toast.error('AI service unavailable. Check GEMINI_API_KEY in backend .env')
      else toast.error(msg ?? 'AI request failed')
    },
  })

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="page-title">AI Tutor</h1>
          <p className="page-desc">Ask questions about any topic or course content</p>
        </div>

        <Card className="p-5 space-y-4">
          <Textarea label="Your Question" placeholder="e.g. Explain React hooks with examples, or How does async/await work?"
            value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button variant="primary" loading={askMutation.isPending} disabled={!question.trim()} onClick={() => askMutation.mutate()} fullWidth>
            Ask AI Tutor
          </Button>
        </Card>

        {response && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <span className="text-base">🤖</span> Answer
              </h3>
              <p className="text-body-md text-text-secondary whitespace-pre-line leading-relaxed">{response.answer}</p>
            </Card>

            {response.examples.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">💡 Examples</h3>
                <ul className="space-y-2">
                  {response.examples.map((ex, i) => (
                    <li key={i} className="flex gap-2 text-sm text-text-secondary">
                      <span className="text-primary-600 shrink-0">→</span>{ex}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {response.relatedTopics.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-medium text-text-muted mb-2">Related Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {response.relatedTopics.map(t => <Badge key={t} variant="primary">{t}</Badge>)}
                </div>
              </Card>
            )}

            {response.followUpQuestions.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-medium text-text-muted mb-2">Follow-up Questions</p>
                <div className="flex flex-wrap gap-2">
                  {response.followUpQuestions.map(q => (
                    <button key={q} onClick={() => setQuestion(q)}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary hover:bg-surface-secondary hover:text-text transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
