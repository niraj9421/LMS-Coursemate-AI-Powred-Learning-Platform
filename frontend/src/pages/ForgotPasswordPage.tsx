import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send reset email')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6"><Logo size={36} showText /></div>
          <h1 className="text-heading-lg text-text mb-1">Reset your password</h1>
          <p className="text-body-md text-text-muted">Enter your email and we'll send a reset link</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-text mb-1">Check your inbox</p>
              <p className="text-xs text-text-muted mb-4">We sent a reset link to <strong>{email}</strong></p>
              <Link to="/login"><Button variant="outline" size="sm" fullWidth>Back to Sign In</Button></Link>
            </div>
          ) : (
            <>
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-danger">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Email address" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Button type="submit" variant="primary" size="md" loading={loading} fullWidth>Send Reset Link</Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
