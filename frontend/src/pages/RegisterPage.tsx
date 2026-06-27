import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { registerUser, clearError } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

const requirements = [
  { test: (p: string) => p.length >= 8, text: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p),  text: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p),  text: 'One number' },
]

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [success, setSuccess] = useState(false)
  const [showPwHints, setShowPwHints] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(registerUser(form))
    if (registerUser.fulfilled.match(result)) {
      const msg = result.payload as string
      if (msg && !msg.toLowerCase().includes('email')) {
        navigate('/login?registered=true')
      } else {
        setSuccess(true)
      }
    }
  }

  if (success) return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-heading-lg text-text mb-2">Check your email</h2>
        <p className="text-body-md text-text-muted mb-6">
          We sent a verification link to <strong className="text-text">{form.email}</strong>
        </p>
        <Link to="/login">
          <Button variant="primary" fullWidth>Back to Sign In</Button>
        </Link>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6"><Logo size={36} showText /></div>
          <h1 className="text-heading-lg text-text mb-1">Create your account</h1>
          <p className="text-body-md text-text-muted">Start your learning journey for free</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" type="text" placeholder="John Doe"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email address" type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <div>
              <Input label="Password" type="password" placeholder="Min 8 chars, uppercase + number"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setShowPwHints(true)}
                required
              />
              {showPwHints && form.password && (
                <ul className="mt-2 space-y-1">
                  {requirements.map(r => (
                    <li key={r.text} className={`flex items-center gap-1.5 text-xs ${r.test(form.password) ? 'text-success' : 'text-text-subtle'}`}>
                      <span>{r.test(form.password) ? '✓' : '○'}</span>
                      {r.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              Create account
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-text-muted">
            By creating an account you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:underline">Terms</Link> and{' '}
            <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
