import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Post {
  _id: string
  title: string
  body: string
  upvotes: string[]
  upvoteCount: number
  replyCount: number
  authorId: { _id: string; name: string; avatar?: string }
  createdAt: string
  tags: string[]
}

interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

const TAG_COLORS: Record<string, string> = {}
const PALETTE = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
]
function tagColor(tag: string): string {
  if (!TAG_COLORS[tag]) {
    TAG_COLORS[tag] = PALETTE[Object.keys(TAG_COLORS).length % PALETTE.length]!
  }
  return TAG_COLORS[tag]!
}

export default function CommunityPage() {
  const { user, loading } = useRequireAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [sort, setSort] = useState<'recent' | 'top'>('recent')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', tags: '' })

  const LIMIT = 10

  const { data, isLoading } = useQuery({
    queryKey: ['posts', sort, page],
    queryFn: async () => {
      const res = await api.get<{ data: PostsResponse }>('/community/posts', {
        params: { sort, page, limit: LIMIT },
      })
      return res.data.data
    },
  })

  const posts = data?.posts ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Collect all unique tags from current page
  const allTags = useMemo(() => {
    const set = new Set<string>()
    posts.forEach(p => p.tags.forEach(t => set.add(t)))
    return Array.from(set)
  }, [posts])

  // Client-side filter by search + active tag
  const filtered = useMemo(() => {
    let result = posts
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    if (activeTag) {
      result = result.filter(p => p.tags.includes(activeTag))
    }
    return result
  }, [posts, search, activeTag])

  const createPost = useMutation({
    mutationFn: () =>
      api.post('/community/posts', {
        title: form.title,
        body: form.body,
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Post created!')
      setShowModal(false)
      setForm({ title: '', body: '', tags: '' })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: () => toast.error('Failed to create post'),
  })

  const upvote = useMutation({
    mutationFn: (id: string) => api.post(`/community/posts/${id}/upvote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  })

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const sortTabs = [
    { id: 'recent', label: '🕐 Recent' },
    { id: 'top', label: '🔥 Top' },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Community</h1>
            <p className="page-desc">Ask questions, share knowledge, connect with peers</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Post
          </Button>
        </div>

        {/* Sort tabs */}
        <Tabs
          tabs={sortTabs}
          active={sort}
          onChange={id => {
            setSort(id as 'recent' | 'top')
            setPage(1)
          }}
          variant="pills"
        />

        {/* Search */}
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          }
        />

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-alt text-text-muted hover:bg-border'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-primary-600 text-white'
                    : `${tagColor(tag)} hover:opacity-80`
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Post list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton rounded="full" className="h-9 w-9 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-heading-sm text-text mb-2">No posts found</h3>
              <p className="text-body-md text-text-muted mb-4">
                {search || activeTag ? 'Try a different search or tag.' : 'Be the first to start a discussion!'}
              </p>
              {!search && !activeTag && (
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                  Create Post
                </Button>
              )}
            </Card>
          ) : (
            filtered.map((post, i) => {
              const hasUpvoted = post.upvotes?.includes(user._id)
              return (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    hover
                    className="p-5 cursor-pointer"
                    onClick={() => navigate(`/dashboard/community/${post._id}`)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Upvote button — stop propagation so card click doesn't fire */}
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            upvote.mutate(post._id)
                          }}
                          className={`flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-colors ${
                            hasUpvoted
                              ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30'
                              : 'text-text-subtle hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                          }`}
                          title={hasUpvoted ? 'Remove upvote' : 'Upvote'}
                        >
                          <svg
                            className="h-4 w-4"
                            fill={hasUpvoted ? 'currentColor' : 'none'}
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          <span className="text-xs font-semibold leading-none">{post.upvoteCount}</span>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <Avatar name={post.authorId?.name ?? 'User'} src={post.authorId?.avatar} size="sm" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-text leading-snug">{post.title}</h3>
                            <p className="text-xs text-text-muted">
                              {post.authorId?.name ?? 'Unknown'} · {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-text-muted line-clamp-2 mb-2 ml-10">{post.body}</p>

                        {/* Tags + reply count */}
                        <div className="flex items-center gap-2 flex-wrap ml-10">
                          {post.tags.map(tag => (
                            <span
                              key={tag}
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagColor(tag)}`}
                            >
                              #{tag}
                            </span>
                          ))}
                          <span className="ml-auto flex items-center gap-1 text-xs text-text-subtle">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {post.replyCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Previous
            </Button>
            <span className="text-sm text-text-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Post"
        description="Share a question, tip, or insight with the community"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="What's your question or topic?"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Body"
            placeholder="Share your thoughts in detail..."
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
          />
          <Input
            label="Tags (comma-separated)"
            placeholder="e.g. javascript, react, interview"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createPost.isPending}
              disabled={!form.title || !form.body}
              onClick={() => createPost.mutate()}
            >
              Publish
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
