import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { loginUser, clearError } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { loading, error, user } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) {
      const role = user.role
      if (role === 'admin') navigate('/admin/dashboard')
      else if (role === 'teacher') navigate('/teacher/dashboard')
      else navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(clearError())
    await dispatch(loginUser(form))
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary flex-col justify-between p-10">
        <Logo size={36} showText className="[&_span]:text-white" />
        <div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Accelerate your career with AI-powered learning
          </h2>
          <p className="text-primary-100 text-lg">
            Join 50,000+ students learning smarter, building faster, and getting hired.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[{ v: '50K+', l: 'Students' }, { v: '500+', l: 'Courses' }, { v: '95%', l: 'Placement' }].map(s => (
              <div key={s.l}>
                <div className="text-2xl font-bold text-white">{s.v}</div>
                <div className="text-primary-200 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-primary-200 text-sm">© 2024 CourseMate. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size={36} showText />
          </div>

          <div className="mb-8">
            <h1 className="text-heading-lg text-text mb-1">Welcome back</h1>
            <p className="text-body-md text-text-muted">Sign in to your account to continue</p>
          </div>

          {params.get('registered') === 'true' && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              ✓ Account created successfully! You can sign in now.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="text-text-subtle hover:text-text transition-colors">
                  {showPassword
                    ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              }
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
