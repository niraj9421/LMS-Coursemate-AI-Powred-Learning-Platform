import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Icons } from '@/components/ui/Icons'
import api from '@/services/api'

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const display = useTransform(spring, (v) => `${Math.floor(v).toLocaleString()}${suffix}`)

  useEffect(() => { if (inView) motionVal.set(value) }, [inView, value, motionVal])

  return <motion.span ref={ref}>{display}</motion.span>
}

// ─── Section fade-in wrapper ───────────────────────────────────────────────────
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      ref={ref as React.RefObject<HTMLElement>}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ─── Course card ──────────────────────────────────────────────────────────────
interface Course {
  _id: string; title: string; thumbnail: string; shortDescription: string
  instructor: { name: string; avatar?: string }
  rating: { average: number; count: number }
  enrollmentCount: number; level: string; price: number; totalLessons: number
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
    >
      <Card hover onClick={() => navigate(`/courses/${course._id}`)}
        className="overflow-hidden group">
        <div className="relative overflow-hidden">
          <img
            src={course.thumbnail || `https://placehold.co/400x225/2563eb/ffffff?text=${encodeURIComponent(course.title.slice(0,12))}`}
            alt={course.title}
            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="primary" className="capitalize">{course.level}</Badge>
          </div>
          {course.price === 0 && (
            <div className="absolute top-3 right-3">
              <Badge variant="success">Free</Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-text line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <Avatar src={course.instructor?.avatar} name={course.instructor?.name ?? 'Instructor'} size="xs" />
            <span className="text-xs text-text-muted">{course.instructor?.name ?? 'Instructor'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-warning font-medium">
                {'★'.repeat(Math.round(course.rating.average))}
              </span>
              <span className="text-xs text-text-muted">{course.rating.average.toFixed(1)}</span>
              <span className="text-xs text-text-subtle">({course.rating.count})</span>
            </div>
            <span className="text-sm font-bold text-text">
              {course.price === 0 ? 'Free' : `$${course.price}`}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Hero Visual (right side) ─────────────────────────────────────────────────

const TECH_ICONS = [
  { label: 'React',      icon: <Icons.Code className="h-5 w-5" />,      color: '#61dafb', bg: '#e8f9fd', angle: 0   },
  { label: 'Python',     icon: <Icons.Cpu className="h-5 w-5" />,       color: '#3776ab', bg: '#dbeafe', angle: 45  },
  { label: 'Node.js',    icon: <Icons.Terminal className="h-5 w-5" />,  color: '#68a063', bg: '#dcfce7', angle: 90  },
  { label: 'AI/ML',      icon: <Icons.Brain className="h-5 w-5" />,     color: '#7c3aed', bg: '#ede9fe', angle: 135 },
  { label: 'Cloud',      icon: <Icons.Cloud className="h-5 w-5" />,     color: '#0284c7', bg: '#e0f2fe', angle: 180 },
  { label: 'DevOps',     icon: <Icons.Settings className="h-5 w-5" />,  color: '#ea580c', bg: '#ffedd5', angle: 225 },
  { label: 'TypeScript', icon: <Icons.Code className="h-5 w-5" />,      color: '#3178c6', bg: '#dbeafe', angle: 270 },
  { label: 'Security',   icon: <Icons.Shield className="h-5 w-5" />,    color: '#dc2626', bg: '#fee2e2', angle: 315 },
]

const CODE_LINES = [
  { text: 'const skills = await ai.analyze(resume)',  color: '#7c3aed' },
  { text: '// ✅ 47 skills detected',                  color: '#16a34a' },
  { text: 'const path = career.recommend(skills)',     color: '#2563eb' },
  { text: '// 🎯 Full Stack Developer — 87% match',   color: '#16a34a' },
  { text: 'await interview.practice({ role: path })', color: '#7c3aed' },
  { text: '// 🏆 Score: 94/100',                      color: '#d97706' },
  { text: 'offer.accept({ company: "Google" })',       color: '#2563eb' },
  { text: '// 🚀 Dream job unlocked!',                 color: '#16a34a' },
]

const ACHIEVEMENT_CARDS = [
  { icon: <Icons.Trophy className="h-5 w-5 text-white" />,    title: 'Offer Received!', sub: 'Google SWE · ₹45 LPA',   color: 'from-yellow-400 to-amber-500',   delay: 0.8 },
  { icon: <Icons.Target className="h-5 w-5 text-white" />,    title: 'ATS Score: 94%',  sub: 'Resume Optimized',        color: 'from-primary-500 to-violet-500', delay: 1.4 },
  { icon: <Icons.Fire className="h-5 w-5 text-white" />,      title: '30-Day Streak',   sub: 'Consistency is key',      color: 'from-orange-400 to-red-500',     delay: 2.0 },
]

function OrbitingIcon({ icon, label, bg, angle, radius = 140 }: { icon: React.ReactNode; label: string; bg: string; angle: number; radius?: number }) {
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * radius
  const y = Math.sin(rad) * radius
  return (
    <motion.div
      style={{ position: 'absolute', left: '50%', top: '50%', x: x - 24, y: y - 24 }}
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 3 + angle / 90, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.2 }}
      title={label}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md border border-white/80 cursor-default select-none"
        style={{ background: bg, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        {icon}
      </div>
      <p className="text-center text-[9px] font-semibold text-text-muted mt-1 whitespace-nowrap">{label}</p>
    </motion.div>
  )
}

function TypingCode() {
  const [visibleLines, setVisibleLines] = useState(0)
  useEffect(() => {
    if (visibleLines >= CODE_LINES.length) return
    const t = setTimeout(() => setVisibleLines(v => v + 1), 900)
    return () => clearTimeout(t)
  }, [visibleLines])

  return (
    <div className="rounded-2xl bg-gray-950 border border-gray-800 p-4 font-mono text-[11px] leading-relaxed shadow-xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-gray-500 text-[10px]">career_path.ts</span>
      </div>
      <div className="space-y-1.5">
        {CODE_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            style={{ color: line.color }}>
            <span className="text-gray-600 mr-3 select-none">{String(i + 1).padStart(2, '0')}</span>
            {line.text}
            {i === visibleLines - 1 && (
              <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block w-1.5 h-3.5 bg-primary-400 ml-0.5 align-middle rounded-sm" />
            )}
          </motion.div>
        ))}
        {visibleLines === 0 && (
          <span className="text-gray-600">
            <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-1.5 h-3.5 bg-primary-400 align-middle rounded-sm" />
          </span>
        )}
      </div>
    </div>
  )
}

function HeroVisual() {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
      className="relative hidden lg:flex flex-col gap-5 items-center">

      {/* Orbit ring */}
      <div className="relative w-72 h-72 mx-auto">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-primary-200/60"
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-8 rounded-full border border-dashed border-violet-200/50"
        />

        {/* Center brain/AI element */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 0 40px rgba(124,58,237,0.3)' }}
          >
            <Icons.Brain className="h-10 w-10 text-white" strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Orbiting tech icons — outer ring */}
        {TECH_ICONS.slice(0, 6).map((t) => (
          <OrbitingIcon key={t.label} {...t} radius={130} />
        ))}

        {/* Orbiting tech icons — inner ring */}
        {TECH_ICONS.slice(6).map((t) => (
          <OrbitingIcon key={t.label} {...t} angle={t.angle + 22} radius={70} />
        ))}
      </div>

      {/* Code terminal */}
      <div className="w-full max-w-sm">
        <TypingCode />
      </div>

      {/* Floating achievement cards */}
      <div className="absolute -right-4 top-4 space-y-2">
        {ACHIEVEMENT_CARDS.map((card) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: card.delay, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.04, x: -4 }}
            className="flex items-center gap-2.5 rounded-2xl bg-white shadow-lg border border-border/60 px-3 py-2.5 cursor-default select-none"
            style={{ minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shrink-0 shadow-sm`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-text leading-tight">{card.title}</p>
              <p className="text-[10px] text-text-muted">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Main HomePage ─────────────────────────────────────────────────────────────
export function HomePage() {
  const { data: coursesData } = useQuery({
    queryKey: ['home-courses'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Course[] } }>('/courses', { params: { limit: 6 } })
      return res.data.data.items
    },
    staleTime: 5 * 60 * 1000,
  })

  const stats = [
    { label: 'Students',     value: 50000,  suffix: '+' },
    { label: 'Courses',      value: 500,    suffix: '+' },
    { label: 'Certificates', value: 12000,  suffix: '+' },
    { label: 'Placements',   value: 3500,   suffix: '+' },
  ]

  const features = [
    { icon: <Icons.Brain className="h-8 w-8" />,     iconBg: 'bg-violet-50 text-violet-600',  title: 'AI-Powered Learning',   desc: 'Personal AI tutor, learning paths, and smart recommendations tailored to you.' },
    { icon: <Icons.Terminal className="h-8 w-8" />,   iconBg: 'bg-green-50 text-green-600',    title: 'Coding Playground',     desc: 'LeetCode-style environment with 500+ problems and AI code review.' },
    { icon: <Icons.Map className="h-8 w-8" />,        iconBg: 'bg-blue-50 text-blue-600',      title: 'Career Mentor',         desc: 'AI career advisor that maps your skills to real job opportunities.' },
    { icon: <Icons.FileText className="h-8 w-8" />,   iconBg: 'bg-amber-50 text-amber-600',    title: 'ATS Resume Analyzer',   desc: 'Optimize your resume with AI-powered ATS scoring and suggestions.' },
    { icon: <Icons.Certificate className="h-8 w-8" />,iconBg: 'bg-yellow-50 text-yellow-600', title: 'Certificates',          desc: 'Earn verifiable certificates recognized by top companies.' },
    { icon: <Icons.Users className="h-8 w-8" />,      iconBg: 'bg-pink-50 text-pink-600',      title: 'Community',             desc: 'Learn alongside thousands of peers, ask questions, and share projects.' },
  ]

  const testimonials = [
    { name: 'Priya Sharma',   company: 'Google',    role: 'SWE', text: 'CourseMate\'s AI tutor and coding playground helped me crack my Google interview. The personalized roadmap was exactly what I needed.' },
    { name: 'Rahul Verma',    company: 'Microsoft', role: 'Data Scientist', text: 'Got placed at Microsoft within 3 months! The ATS resume analyzer boosted my shortlisting rate by 3x.' },
    { name: 'Ananya Patel',   company: 'Amazon',    role: 'Cloud Architect', text: 'The structured curriculum + AI mentor made complex cloud concepts click instantly. Best investment I made.' },
  ]

  const techStack = [
    { name: 'React',        color: 'bg-blue-50 text-blue-700 border-blue-200',      icon: <Icons.Code className="h-4 w-4" /> },
    { name: 'Node.js',      color: 'bg-green-50 text-green-700 border-green-200',    icon: <Icons.Terminal className="h-4 w-4" /> },
    { name: 'Python',       color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Icons.Cpu className="h-4 w-4" /> },
    { name: 'AI/ML',        color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Icons.Brain className="h-4 w-4" /> },
    { name: 'DevOps',       color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Icons.Settings className="h-4 w-4" /> },
    { name: 'Data Science', color: 'bg-pink-50 text-pink-700 border-pink-200',       icon: <Icons.ChartBar className="h-4 w-4" /> },
    { name: 'Cloud',        color: 'bg-sky-50 text-sky-700 border-sky-200',          icon: <Icons.Cloud className="h-4 w-4" /> },
    { name: 'Cybersecurity',color: 'bg-red-50 text-red-700 border-red-200',          icon: <Icons.Shield className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-mesh-hero">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div animate={{ y: [0, -24, 0], scale: [1, 1.06, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
          <motion.div animate={{ y: [0, 20, 0], scale: [1, 1.08, 1] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />
          <motion.div animate={{ x: [0, 15, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute left-1/2 top-1/4 h-48 w-48 rounded-full bg-emerald-200/25 blur-2xl" />
        </div>

        <div className="container-app relative py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: Text + CTA ───────────────────────────────── */}
            <div className="text-center lg:text-left">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary-700 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                  </span>
                  AI-Powered Learning Platform
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl sm:text-6xl font-extrabold text-text mb-5 leading-tight tracking-tight"
              >
                Learn. Build.{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Get Hired.
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 9C60 3 120 1 150 1C180 1 240 3 298 9" stroke="url(#ug)" strokeWidth="3" strokeLinecap="round"/>
                    <defs><linearGradient id="ug" x1="0" y1="0" x2="300" y2="0"><stop stopColor="#2563eb"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-text-muted mb-8 max-w-lg"
              >
                AI-Powered Learning for Future Engineers. Master in-demand skills, solve real problems, and land your dream job.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start"
              >
                <Link to="/register"
                  className="rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-7 py-3.5 text-base font-semibold text-white hover:from-primary-700 hover:to-violet-700 transition-all shadow-lg shadow-primary-500/30 hover:shadow-xl hover:-translate-y-0.5">
                  Start for Free →
                </Link>
                <Link to="/courses"
                  className="rounded-xl border-2 border-border bg-white/80 backdrop-blur-sm px-7 py-3.5 text-base font-semibold text-text hover:bg-surface-secondary hover:border-primary-200 transition-all">
                  Explore Courses
                </Link>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/80 py-3 px-2 shadow-sm text-center">
                    <div className="text-2xl font-extrabold text-text">
                      <AnimatedCounter value={s.value} suffix={s.suffix} />
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5 font-medium">{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── Right: 3D Animated Showcase ────────────────────── */}
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── Tech Stack Tags ────────────────────────────────────────────────── */}
      <Section className="py-12 border-b border-border bg-surface">
        <div className="container-app">
          <p className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider mb-6">
            Master In-Demand Technologies
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {techStack.map((t, i) => (
              <motion.span
                key={t.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${t.color}`}
              >
                {t.icon} {t.name}
              </motion.span>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <Section className="section bg-surface-secondary">
        <div className="container-app">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 mb-4 uppercase tracking-wider">Platform Features</span>
            <h2 className="text-display-sm text-text mb-4">Everything You Need to Succeed</h2>
            <p className="text-body-lg text-text-muted max-w-xl mx-auto">
              From learning to placement — one platform to take you from student to professional.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const accents = ['accent-blue','accent-purple','accent-green','accent-orange','accent-yellow','accent-pink']
              return (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <div className={`feature-card ${accents[i % accents.length]}`}>
                    <div className={`mb-4 w-14 h-14 rounded-2xl flex items-center justify-center ${f.iconBg}`}>
                      {f.icon}
                    </div>
                    <h3 className="text-heading-sm text-text mb-2">{f.title}</h3>
                    <p className="text-body-md text-text-muted">{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ── Featured Courses ───────────────────────────────────────────────── */}
      <Section className="section bg-surface">
        <div className="container-app">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-display-sm text-text mb-1">Featured Courses</h2>
              <p className="text-body-md text-text-muted">Curated courses to accelerate your career</p>
            </div>
            <Link to="/courses" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
              View all →
            </Link>
          </div>
          {(coursesData ?? []).length === 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-64 animate-pulse bg-surface-secondary rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(coursesData ?? []).map((course, i) => (
                <CourseCard key={course._id} course={course} index={i} />
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link to="/courses"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text hover:bg-surface-secondary transition-colors">
              Browse All Courses →
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <Section className="section bg-surface-secondary">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="text-display-sm text-text mb-3">Students Getting Placed</h2>
            <p className="text-body-lg text-text-muted">Real stories from real learners</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 bg-surface h-full flex flex-col">
                  <div className="flex mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <svg key={j} className="h-4 w-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-body-md text-text-secondary flex-1 mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar name={t.name} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-text">{t.name}</p>
                      <p className="text-xs text-text-muted">{t.role} @ {t.company}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <Section className="relative overflow-hidden">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-violet-600 to-indigo-700" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-400/20 blur-2xl" />

        <div className="container-app relative text-center py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-block rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-1 text-xs font-semibold text-white uppercase tracking-wider mb-6">
              🚀 Start Your Journey Today
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to Transform<br />Your Career?
            </h2>
            <p className="text-lg text-primary-100 mb-10 max-w-xl mx-auto leading-relaxed">
              Join 50,000+ students who are learning smarter, building faster, and getting hired at top companies.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/register"
                className="rounded-xl bg-white px-8 py-4 text-base font-bold text-primary-600 hover:bg-primary-50 transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl">
                Start Learning Free →
              </Link>
              <Link to="/courses"
                className="rounded-xl border-2 border-white/40 backdrop-blur-sm bg-white/10 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-all">
                Browse Courses
              </Link>
            </div>
            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-primary-100 text-sm">
              <span className="flex items-center gap-1.5">✓ No credit card required</span>
              <span className="flex items-center gap-1.5">✓ Free courses available</span>
              <span className="flex items-center gap-1.5">✓ Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </Section>

      <Footer />
    </div>
  )
}

export default HomePage
