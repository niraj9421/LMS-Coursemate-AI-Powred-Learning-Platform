import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      await api.post(`/auth/reset-password/${token}`, { password })
      navigate('/login?reset=success')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Reset failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6"><Logo size={36} showText /></div>
          <h1 className="text-heading-lg text-text mb-1">Set new password</h1>
          <p className="text-body-md text-text-muted">Must be at least 8 characters</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-danger">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="New Password" type="password" placeholder="Min 8 chars, uppercase + number"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <Input label="Confirm Password" type="password" placeholder="Repeat your password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <Button type="submit" variant="primary" size="md" loading={loading} fullWidth>Reset Password</Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
