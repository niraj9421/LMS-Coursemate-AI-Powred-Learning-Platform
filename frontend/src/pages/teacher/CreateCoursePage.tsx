import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Category { _id: string; name: string; slug: string }

export default function CreateCoursePage() {
  const { user, loading: authLoading } = useRequireAuth('teacher')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', shortDescription: '', category: '',
    level: 'beginner', language: 'English', price: '0',
    tags: '', requirements: '', outcomes: '',
  })

  // Load categories for the dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories')
      return res.data.data
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category) { toast.error('Please select a category'); return }
    setLoading(true)
    try {
      // Step 1: Create course via JSON (handles Zod array/number validation correctly)
      const payload = {
        title: form.title,
        description: form.description,
        shortDescription: form.shortDescription,
        category: form.category,
        level: form.level,
        language: form.language,
        price: parseFloat(form.price) || 0,
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').filter(Boolean),
        outcomes: form.outcomes.split('\n').filter(Boolean),
        certificate: true,
      }

      const res = await api.post<{ data: { _id: string } }>('/courses', payload)
      const courseId = res.data.data._id

      // Step 2: Upload thumbnail if provided via dedicated endpoint
      if (thumbnail) {
        const fd = new FormData()
        fd.append('thumbnail', thumbnail)
        await api.post(`/courses/${courseId}/thumbnail`, fd)
      }

      toast.success('Course created successfully!')
      navigate(`/teacher/dashboard`)
    } catch (err: unknown) {
      const errData = err as { response?: { data?: { message?: string; error?: Array<{field:string;message:string}> } } }
      const validationErrors = errData?.response?.data?.error
      if (Array.isArray(validationErrors)) {
        toast.error(validationErrors.map(e => `${e.field}: ${e.message}`).join('\n'))
      } else {
        toast.error(errData?.response?.data?.message ?? 'Failed to create course')
      }
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (authLoading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  )

  return (
    <DashboardLayout role="teacher">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="page-title">Create New Course</h1>
          <p className="page-desc">Fill in the details to create your course draft</p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-5">
            {/* Basic Info */}
            <Input label="Course Title *" placeholder="e.g. Complete React Developer Course"
              value={form.title} onChange={set('title')} required minLength={5} />

            <Textarea label="Description *" placeholder="Detailed course description (min 20 chars)..."
              value={form.description} onChange={set('description')} required />

            <Input label="Short Description *" placeholder="One-line summary (max 300 chars)"
              value={form.shortDescription} onChange={set('shortDescription')} required />

            {/* Category & Level */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text">Category *</label>
                <select value={form.category} onChange={set('category')} required
                  className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary-500">
                  <option value="">Select a category</option>
                  {(categories ?? []).map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text">Level</label>
                <select value={form.level} onChange={set('level')}
                  className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary-500">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Price (USD)" type="number" min="0" step="0.01"
                value={form.price} onChange={set('price')} />
              <Input label="Language" value={form.language} onChange={set('language')} />
            </div>

            {/* Tags */}
            <div>
              <Input label="Tags (comma-separated)" placeholder="react, javascript, typescript"
                value={form.tags} onChange={set('tags')} />
              {form.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="rounded-full bg-primary-50 border border-primary-200 px-2 py-0.5 text-xs text-primary-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Textarea label="Requirements (one per line)"
              placeholder={"Basic JavaScript knowledge\nNode.js installed\nBasic HTML/CSS"}
              value={form.requirements} onChange={set('requirements')} />

            <Textarea label="Learning Outcomes (one per line)"
              placeholder={"Build complete React applications\nUnderstand hooks and state management"}
              value={form.outcomes} onChange={set('outcomes')} />

            {/* Thumbnail */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text">Thumbnail Image (optional)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp"
                aria-label="Upload course thumbnail image"
                onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                className="text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-primary-700 file:cursor-pointer hover:file:bg-primary-100" />
              {thumbnail && <p className="text-xs text-success">✓ {thumbnail.name} selected</p>}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => navigate('/teacher/dashboard')}>Cancel</Button>
              <Button type="submit" variant="primary" loading={loading}>Create Course</Button>
            </div>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
