import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { fetchMe } from '@/features/auth/authSlice'
import { tokenStorage } from '@/services/api'

/**
 * Ensures user is authenticated.
 * - If a token exists but user isn't loaded yet, fetches user silently.
 * - Redirects to /login only after initialization is complete and no user found.
 * - If requiredRole set, redirects to /dashboard if role doesn't match.
 */
export function useRequireAuth(requiredRole?: 'student' | 'teacher' | 'admin') {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const loading = useAppSelector((s) => s.auth.loading)
  const initialized = useAppSelector((s) => s.auth.initialized)

  useEffect(() => {
    if (!initialized && !loading) {
      if (tokenStorage.getAccess()) {
        dispatch(fetchMe())
      } else {
        navigate('/login')
      }
    }
  }, [initialized, loading, dispatch, navigate])

  useEffect(() => {
    if (initialized && !user) {
      navigate('/login')
    }
  }, [initialized, user, navigate])

  useEffect(() => {
    if (user && requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      // Teacher trying to access student-only page → redirect to teacher dashboard
      if (user.role === 'teacher') {
        navigate('/teacher/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [user, requiredRole, navigate])

  const isLoading = !initialized || loading

  return { user, loading: isLoading }
}
