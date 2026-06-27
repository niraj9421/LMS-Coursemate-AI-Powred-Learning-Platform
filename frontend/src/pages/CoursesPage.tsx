import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs } from '@/components/ui/Tabs'

interface Course {
  _id: string; title: string; thumbnail: string; shortDescription: string
  instructor: { name: string; avatar?: string }
  rating: { average: number; count: number }
  enrollmentCount: number; level: string; price: number; totalLessons: number; totalDuration: number
}

const levelTabs = [
  { id: 'all',          label: 'All' },
  { id: 'beginner',     label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced',     label: 'Advanced' },
]

const levelVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  beginner: 'success', intermediate: 'warning', advanced: 'danger',
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('all')
  const [cursor, setCursor] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search, level, cursor],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Course[]; hasMore: boolean; nextCursor: string | null; total?: number } }>('/courses', {
        params: {
          q: search || undefined,
          level: level !== 'all' ? level : undefined,
          cursor,
          limit: 12
        },
      })
      return res.data.data
    },
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      {/* Page header */}
      <div className="border-b border-border bg-surface">
        <div className="container-app py-8">
          <h1 className="text-display-sm text-text mb-1">Explore Courses</h1>
          <p className="text-body-lg text-text-muted">Discover expert-led courses to accelerate your career</p>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search courses, topics, or skills..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCursor(undefined) }}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
          </div>
          <div className="shrink-0">
            <Tabs
              tabs={levelTabs}
              active={level}
              onChange={(id) => { setLevel(id); setCursor(undefined) }}
              variant="boxed"
            />
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-text-muted mb-5">
            {data?.hasMore
              ? `Showing ${(data?.items ?? []).length} of ${data?.total ?? 'many'} courses`
              : `${(data?.items ?? []).length} course${(data?.items ?? []).length !== 1 ? 's' : ''} found`
            }
            {search && ` for "${search}"`}
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => <Skeleton.Card key={i} />)
            : (data?.items ?? []).map((course, i) => (
                <motion.div key={course._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Card hover onClick={() => navigate(`/courses/${course._id}`)}
                    className="overflow-hidden group h-full flex flex-col">
                    <div className="relative overflow-hidden">
                      <img
                         src={course.thumbnail || `https://placehold.co/400x225/2563eb/ffffff?text=${encodeURIComponent(course.title.slice(0,12))}`}
                        alt={course.title}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-3 left-3">
                        <Badge variant={levelVariant[course.level] ?? 'default'} className="capitalize">{course.level}</Badge>
                      </div>
                      {course.price === 0 && (
                        <div className="absolute top-3 right-3"><Badge variant="success">Free</Badge></div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-sm font-semibold text-text line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors flex-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-text-muted line-clamp-2 mb-3">{course.shortDescription}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar src={course.instructor?.avatar} name={course.instructor?.name ?? 'Instructor'} size="xs" />
                        <span className="text-xs text-text-muted truncate">{course.instructor?.name ?? 'Instructor'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-warning">★</span>
                          <span className="text-xs font-medium text-text">{course.rating.average.toFixed(1)}</span>
                          <span className="text-xs text-text-muted">({course.rating.count})</span>
                        </div>
                        <span className="text-sm font-bold text-text">
                          {course.price === 0 ? 'Free' : `$${course.price}`}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
        </div>

        {/* Empty state */}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <div className="py-20 text-center">
            <svg className="h-12 w-12 text-text-subtle mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-heading-sm text-text mb-2">No courses found</h3>
            <p className="text-body-md text-text-muted mb-4">Try a different search or filter</p>
            <Button variant="secondary" onClick={() => { setSearch(''); setLevel('all') }}>Clear filters</Button>
          </div>
        )}

        {/* Load more */}
        {data?.hasMore && (
          <div className="mt-10 text-center">
            <Button variant="outline" onClick={() => setCursor(data.nextCursor ?? undefined)}>
              Load more courses
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
