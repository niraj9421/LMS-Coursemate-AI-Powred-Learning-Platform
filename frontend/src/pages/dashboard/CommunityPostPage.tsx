import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Author {
  _id: string
  name: string
  avatar?: string
}

interface Post {
  _id: string
  title: string
  body: string
  tags: string[]
  upvotes: string[]
  upvoteCount: number
  replyCount: number
  authorId: Author
  createdAt: string
}

interface Reply {
  _id: string
  body: string
  authorId: Author
  parentReplyId?: string
  createdAt: string
}

interface PostDetailResponse {
  post: Post
  replies: Reply[]
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Reply item (recursive for nesting) ──────────────────────────────────────

interface ReplyItemProps {
  reply: Reply
  allReplies: Reply[]
  depth: number
  onReplyTo: (id: string, authorName: string) => void
}

function ReplyItem({ reply, allReplies, depth, onReplyTo }: ReplyItemProps) {
  const children = allReplies.filter(r => r.parentReplyId === reply._id)

  return (
    <div className={depth > 0 ? 'pl-6 border-l-2 border-border' : ''}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-3"
      >
        <div className="flex items-start gap-3">
          <Avatar name={reply.authorId?.name ?? 'User'} src={reply.authorId?.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-text">{reply.authorId?.name ?? 'Unknown'}</span>
              <span className="text-xs text-text-subtle">·</span>
              <span className="text-xs text-text-muted">{formatDate(reply.createdAt)}</span>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{reply.body}</p>
            <button
              onClick={() => onReplyTo(reply._id, reply.authorId?.name ?? 'User')}
              className="mt-1.5 text-xs font-medium text-text-muted hover:text-primary-600 transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      </motion.div>

      {/* Nested children */}
      {children.map(child => (
        <ReplyItem
          key={child._id}
          reply={child}
          allReplies={allReplies}
          depth={depth + 1}
          onReplyTo={onReplyTo}
        />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { user, loading } = useRequireAuth()
  const qc = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [replyBody, setReplyBody] = useState('')
  const [parentReplyId, setParentReplyId] = useState<string | null>(null)
  const [replyingToName, setReplyingToName] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await api.get<{ data: PostDetailResponse }>(`/community/posts/${postId}`)
      return res.data.data
    },
    enabled: !!postId,
  })

  const upvote = useMutation({
    mutationFn: () => api.post(`/community/posts/${postId}/upvote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const deletePost = useMutation({
    mutationFn: () => api.delete(`/community/posts/${postId}`),
    onSuccess: () => {
      toast.success('Post deleted')
      navigate('/dashboard/community')
    },
    onError: () => toast.error('Failed to delete post'),
  })

  const addReply = useMutation({
    mutationFn: () =>
      api.post(`/community/posts/${postId}/reply`, {
        body: replyBody,
        ...(parentReplyId ? { parentReplyId } : {}),
      }),
    onSuccess: () => {
      toast.success('Reply posted!')
      setReplyBody('')
      setParentReplyId(null)
      setReplyingToName(null)
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
    onError: () => toast.error('Failed to post reply'),
  })

  function handleReplyTo(id: string, name: string) {
    setParentReplyId(id)
    setReplyingToName(name)
    textareaRef.current?.focus()
  }

  function cancelReply() {
    setParentReplyId(null)
    setReplyingToName(null)
  }

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  const post = data?.post
  const replies = data?.replies ?? []

  // Top-level replies only (no parent)
  const rootReplies = replies.filter(r => !r.parentReplyId)

  const hasUpvoted = post?.upvotes?.includes(user._id)
  const isAuthor = post?.authorId?._id === user._id

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard/community')}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Community
        </button>

        {/* ── Post card ─────────────────────────────────────────── */}
        {isLoading ? (
          <Card className="p-6 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </Card>
        ) : isError || !post ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">😕</div>
            <h3 className="text-heading-sm text-text mb-2">Post not found</h3>
            <p className="text-body-md text-text-muted">It may have been deleted or doesn't exist.</p>
          </Card>
        ) : (
          <Card className="p-6">
            {/* Title row */}
            <div className="flex items-start gap-4">
              <Avatar name={post.authorId?.name ?? 'User'} src={post.authorId?.avatar} size="lg" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-text leading-snug mb-0.5">{post.title}</h1>
                <p className="text-xs text-text-muted mb-2">
                  by <span className="font-medium text-text-secondary">{post.authorId?.name ?? 'Unknown'}</span>
                  {' · '}
                  {formatDate(post.createdAt)}
                </p>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.map(tag => (
                      <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColor(tag)}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Upvote */}
              <button
                onClick={() => upvote.mutate()}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 border transition-colors ${
                  hasUpvoted
                    ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/30'
                    : 'border-border text-text-muted hover:border-primary-400 hover:text-primary-600'
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
                <span className="text-xs font-bold">{post.upvoteCount}</span>
              </button>
            </div>

            {/* Body */}
            <p className="text-sm text-text-secondary whitespace-pre-wrap mt-4 leading-relaxed">
              {post.body}
            </p>

            {/* Stats + delete */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
              </span>

              {isAuthor && (
                <button
                  onClick={() => {
                    if (confirm('Delete this post? This cannot be undone.')) deletePost.mutate()
                  }}
                  className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete post
                </button>
              )}
            </div>
          </Card>
        )}

        {/* ── Replies ───────────────────────────────────────────── */}
        {!isLoading && post && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-text mb-4">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </h2>

            {replies.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-sm text-text-muted">No replies yet — be the first to respond!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rootReplies.map(reply => (
                  <ReplyItem
                    key={reply._id}
                    reply={reply}
                    allReplies={replies}
                    depth={0}
                    onReplyTo={handleReplyTo}
                  />
                ))}
              </div>
            )}

            {/* Reply composer */}
            <div className="mt-6 pt-5 border-t border-border space-y-3">
              {replyingToName && (
                <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-alt rounded-lg px-3 py-2">
                  <svg className="h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Replying to <span className="font-medium text-text-secondary">{replyingToName}</span>
                  <button onClick={cancelReply} className="ml-auto hover:text-text transition-colors">✕</button>
                </div>
              )}

              <Textarea
                ref={textareaRef}
                placeholder="Write a reply..."
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-3">
                {(replyBody || parentReplyId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyBody('')
                      cancelReply()
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  loading={addReply.isPending}
                  disabled={!replyBody.trim()}
                  onClick={() => addReply.mutate()}
                >
                  Post Reply
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
