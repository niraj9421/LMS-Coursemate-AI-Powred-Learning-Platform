import { QueryClient } from '@tanstack/react-query'

// ─── React Query Client ───────────────────────────────────────────────────────
// Centralised configuration so the same instance is used across the app
// and can be imported in tests or utility functions without going through
// the component tree.

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes before a background refetch
      staleTime: 1000 * 60 * 5,
      // Retry once on failure (avoids hammering a down server)
      retry: 1,
      // Keep unused query data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Don't refetch on window focus in development to reduce noise
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      // Don't retry mutations by default — side effects should not be duplicated
      retry: 0,
    },
  },
})
