import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Logo } from '@/components/ui/Logo'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-card p-8 text-center">
        <div className="flex justify-center mb-6"><Logo size={32} showText /></div>
        {status === 'loading' && (
          <><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-body-md text-text-muted">Verifying your email...</p></>
        )}
        {status === 'success' && (
          <><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-heading-md text-text mb-2">Email Verified!</h2>
          <p className="text-body-md text-text-muted mb-6">Your account is now active. You can sign in.</p>
          <Link to="/login" className="inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
            Go to Sign In
          </Link></>
        )}
        {status === 'error' && (
          <><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-heading-md text-text mb-2">Verification Failed</h2>
          <p className="text-body-md text-text-muted mb-6">The link may have expired. Please register again.</p>
          <Link to="/register" className="inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
            Register Again
          </Link></>
        )}
      </motion.div>
    </div>
  )
}
