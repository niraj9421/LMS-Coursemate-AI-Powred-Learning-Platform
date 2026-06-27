import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { useAppSelector } from '@/app/hooks'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

interface Lesson { _id: string; title: string; type: string; isFree: boolean; content?: { duration?: number } }
interface Chapter { _id: string; title: string; lessons: Lesson[] }
interface CourseDetail {
  _id: string; title: string; description: string; shortDescription: string
  thumbnail: string; level: string; language: string; price: number
  enrollmentCount: number; totalLessons: number; totalDuration: number
  rating: { average: number; count: number }
  instructor: { _id: string; name: string; avatar: string; bio?: string }
  chapters: Chapter[]; requirements: string[]; outcomes: string[]
  certificate: boolean; tags: string[]
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const res = await api.get<{ data: { course: CourseDetail; isEnrolled: boolean } }>(`/courses/${id}`)
      return res.data.data
    },
  })

  const enrollMutation = useMutation({
    mutationFn: () => api.post(`/courses/${id}/enroll`),
    onSuccess: () => {
      toast.success('Enrolled successfully!')
      qc.invalidateQueries({ queryKey: ['course', id] })
      navigate('/dashboard/courses')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Enrollment failed'
      toast.error(msg)
    },
  })

  const handleEnroll = () => {
    if (!user) { navigate('/login'); return }
    enrollMutation.mutate()
  }

  if (isLoading) return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )

  const course = data?.course
  const isEnrolled = data?.isEnrolled ?? false
  if (!course) return null

  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — course info */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="primary" className="capitalize">{course.level}</Badge>
                <Badge variant="default">{course.language}</Badge>
                {course.certificate && <Badge variant="success">Certificate</Badge>}
              </div>
              <h1 className="text-3xl font-bold text-text mb-3">{course.title}</h1>
              <p className="text-text-muted mb-4">{course.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                <span className="text-warning font-medium">{'★'.repeat(Math.round(course.rating.average))} {course.rating.average.toFixed(1)}</span>
                <span>({course.rating.count} ratings)</span>
                <span>{course.enrollmentCount.toLocaleString()} students</span>
                <span>{course.totalLessons} lessons</span>
                <span>{Math.round(course.totalDuration / 60)}h total</span>
              </div>
            </motion.div>

            {/* Thumbnail */}
            <img
              src={course.thumbnail || `https://placehold.co/800x450/2563eb/ffffff?text=${encodeURIComponent(course.title.slice(0, 12))}`}
              alt={course.title}
              className="w-full rounded-2xl object-cover max-h-80"
            />

            {/* Instructor */}
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-secondary p-4">
              <Avatar src={course.instructor?.avatar} name={course.instructor?.name ?? 'Instructor'} size="lg" />
              <div>
                <p className="text-xs text-text-muted">Instructor</p>
                <p className="font-semibold text-text">{course.instructor?.name ?? 'Unknown Instructor'}</p>
                {course.instructor?.bio && <p className="text-xs text-text-muted mt-1 line-clamp-2">{course.instructor.bio}</p>}
              </div>
            </div>

            {/* What you'll learn */}
            {course.outcomes.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-secondary p-5">
                <h2 className="font-semibold text-text mb-3">What you'll learn</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.outcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-success mt-0.5 shrink-0">✓</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {course.requirements.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-secondary p-5">
                <h2 className="font-semibold text-text mb-3">Requirements</h2>
                <ul className="space-y-1">
                  {course.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-text-subtle shrink-0">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Curriculum */}
            <div>
              <h2 className="font-semibold text-text mb-3">Course Curriculum</h2>
              <div className="space-y-2">
                {course.chapters.map((ch) => (
                  <details key={ch._id} className="rounded-xl border border-border bg-surface-secondary">
                    <summary className="cursor-pointer px-4 py-3 font-medium text-text flex justify-between items-center list-none">
                      <span>{ch.title}</span>
                      <span className="text-xs text-text-muted">{ch.lessons.length} lessons</span>
                    </summary>
                    <ul className="px-4 pb-3 space-y-1 border-t border-border mt-0 pt-2">
                      {ch.lessons.map((l) => (
                        <li key={l._id} className="flex items-center gap-2 text-sm text-text-muted py-1">
                          <span className="text-text-subtle">
                            {l.type === 'video' ? '▶' : l.type === 'quiz' ? '?' : '□'}
                          </span>
                          <span className="flex-1">{l.title}</span>
                          {l.isFree && <Badge variant="success" className="text-[10px]">Free</Badge>}
                          {l.content?.duration && <span className="text-xs">{Math.round(l.content.duration / 60)}m</span>}
                          {!l.isFree && !isEnrolled && <span className="text-xs text-text-subtle">🔒</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-semibold text-text mb-3">About this course</h2>
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">{course.description}</p>
            </div>
          </div>

          {/* Right — enroll card */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border bg-surface shadow-lg p-6">
              <div className="text-3xl font-bold text-text mb-1">
                {course.price === 0 ? 'Free' : `$${course.price}`}
              </div>
              <p className="text-xs text-text-muted mb-5">Lifetime access</p>

              {isEnrolled ? (
                <Button variant="secondary" size="lg" className="w-full mb-3"
                  onClick={() => navigate('/dashboard/courses')}>
                  Go to Course →
                </Button>
              ) : (
                <Button variant="primary" size="lg" className="w-full mb-3"
                  loading={enrollMutation.isPending} onClick={handleEnroll}>
                  {user ? 'Enroll Now' : 'Sign in to Enroll'}
                </Button>
              )}

              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-center gap-2"><span className="text-success">✓</span> {course.totalLessons} lessons</li>
                <li className="flex items-center gap-2"><span className="text-success">✓</span> {Math.round(course.totalDuration / 60)}h of content</li>
                <li className="flex items-center gap-2"><span className="text-success">✓</span> Full lifetime access</li>
                {course.certificate && <li className="flex items-center gap-2"><span className="text-success">✓</span> Certificate of completion</li>}
              </ul>

              {course.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {course.tags.map((t) => <Badge key={t} variant="default" className="text-xs">{t}</Badge>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
