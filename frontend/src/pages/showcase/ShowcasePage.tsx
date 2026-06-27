import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface ShowcaseProject {
  _id: string; title: string; description: string; coverImage: string
  techStack: string[]; tags: string[]; githubUrl?: string; liveDemoUrl?: string
  likeCount: number; commentCount: number; bookmarkCount: number; isFeatured: boolean
  authorId: { name: string; avatar?: string }; createdAt: string
}

export default function ShowcasePage() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [sort, setSort] = useState('trending')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', techStack: '', tags: '', githubUrl: '', liveDemoUrl: '' })
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['showcase', sort],
    queryFn: async () => {
      const res = await api.get<{ data: { projects: ShowcaseProject[] } }>('/showcase', { params: { sort } })
      return res.data.data.projects
    },
  })

  const { data: featured } = useQuery({
    queryKey: ['showcase-featured'],
    queryFn: async () => { const res = await api.get<{ data: ShowcaseProject[] }>('/showcase/featured'); return res.data.data },
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.set('techStack', JSON.stringify(form.techStack.split(',').map(s => s.trim()).filter(Boolean)))
      fd.set('tags', JSON.stringify(form.tags.split(',').map(s => s.trim()).filter(Boolean)))
      if (coverFile) fd.append('coverImage', coverFile)
      return api.post('/showcase', fd)
    },
    onSuccess: () => { toast.success('Project published!'); setShowCreate(false); setForm({ title: '', description: '', techStack: '', tags: '', githubUrl: '', liveDemoUrl: '' }); qc.invalidateQueries({ queryKey: ['showcase'] }) },
    onError: () => toast.error('Failed to publish project'),
  })

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/showcase/${id}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['showcase'] }),
    onError: () => toast.error('Failed to like project'),
  })

  const sortTabs = [
    { id: 'trending', label: '🔥 Trending' },
    { id: 'recent',   label: '🕐 Recent' },
    { id: 'liked',    label: '❤ Most Liked' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="border-b border-border bg-surface">
        <div className="container-app py-8 flex items-end justify-between">
          <div>
            <h1 className="text-display-sm text-text mb-1">Project Showcase</h1>
            <p className="text-body-lg text-text-muted">Discover and share amazing student projects</p>
          </div>
          {user && (
            <Button variant="primary" onClick={() => setShowCreate(true)}
              leftIcon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
              Share Project
            </Button>
          )}
        </div>
      </div>

      <div className="container-app py-8">
        {/* Featured */}
        {(featured ?? []).length > 0 && (
          <div className="mb-8">
            <h2 className="text-heading-md text-text mb-4">⭐ Featured Projects</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(featured ?? []).map((p) => (
                <Card key={p._id} hover className="overflow-hidden group">
                  <div className="relative h-40 overflow-hidden bg-surface-secondary">
                    {p.coverImage
                      ? <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      : <div className="h-full w-full flex items-center justify-center text-4xl">🚀</div>
                    }
                    <div className="absolute top-2 left-2"><Badge variant="warning">⭐ Featured</Badge></div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-text mb-1">{p.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">{p.techStack.slice(0, 3).map(t => <Badge key={t} variant="primary" className="text-[10px]">{t}</Badge>)}</div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>❤ {p.likeCount}</span><span>💬 {p.commentCount}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <Tabs tabs={sortTabs} active={sort} onChange={setSort} variant="pills" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton.Card key={i} />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-3">🚀</div>
            <h3 className="text-heading-sm text-text mb-2">No projects yet</h3>
            <p className="text-body-md text-text-muted mb-4">Be the first to share your project!</p>
            {user && <Button variant="primary" onClick={() => setShowCreate(true)}>Share Your Project</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card hover className="overflow-hidden group h-full flex flex-col">
                  <div className="relative h-44 overflow-hidden bg-surface-secondary">
                    {p.coverImage
                      ? <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      : <div className="h-full w-full flex items-center justify-center text-5xl">🚀</div>
                    }
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-text mb-1 group-hover:text-primary-600 transition-colors">{p.title}</h3>
                    <p className="text-xs text-text-muted line-clamp-2 mb-3 flex-1">{p.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">{p.techStack.slice(0, 4).map(t => <Badge key={t} variant="primary" className="text-[10px]">{t}</Badge>)}</div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Avatar src={p.authorId.avatar} name={p.authorId.name} size="xs" />
                        <span className="text-xs text-text-muted">{p.authorId.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <button onClick={() => user ? likeMutation.mutate(p._id) : navigate('/login')}
                          className="flex items-center gap-1 hover:text-danger transition-colors">
                          ❤ {p.likeCount}
                        </button>
                        <span>💬 {p.commentCount}</span>
                        {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors" onClick={e => e.stopPropagation()}>GitHub</a>}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Share Your Project" size="lg">
        <div className="space-y-4">
          <Input label="Project Title *" placeholder="My Awesome Project" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <Textarea label="Description *" placeholder="What does your project do? What problem does it solve?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <Input label="Tech Stack (comma-separated) *" placeholder="React, Node.js, MongoDB" value={form.techStack} onChange={e => setForm({...form, techStack: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="GitHub URL" placeholder="https://github.com/..." value={form.githubUrl} onChange={e => setForm({...form, githubUrl: e.target.value})} />
            <Input label="Live Demo URL" placeholder="https://myproject.com" value={form.liveDemoUrl} onChange={e => setForm({...form, liveDemoUrl: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Cover Image *</label>
            <input type="file" accept="image/*"
              aria-label="Upload project cover image"
              onChange={e => setCoverFile(e.target.files?.[0] ?? null)}
              className="text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-primary-600 file:cursor-pointer" />
            {coverFile && <p className="text-xs text-success">✓ {coverFile.name}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={createMutation.isPending}
              disabled={!form.title || !form.description || !form.techStack || !coverFile}
              onClick={() => createMutation.mutate()}>
              Publish Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
