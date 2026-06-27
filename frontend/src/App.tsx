import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { store } from '@/app/store'
import { queryClient } from '@/app/queryClient'
import { AppRoutes } from '@/app/routes'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { fetchMe } from '@/features/auth/authSlice'
import { tokenStorage } from '@/services/api'

// Restore session on app boot if token exists
if (tokenStorage.getAccess()) {
  store.dispatch(fetchMe())
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(17, 24, 39, 0.9)',
                  color: '#f9fafb',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                },
              }}
            />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  )
}

export default App
