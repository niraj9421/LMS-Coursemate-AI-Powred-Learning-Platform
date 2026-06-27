import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api, { tokenStorage } from '@/services/api'

interface User {
  _id: string
  name: string
  email: string
  avatar: string
  role: 'admin' | 'teacher' | 'student'
  gamification: { xp: number; level: number; streak: number }
  isEmailVerified: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  initialized: boolean
}

const initialState: AuthState = { user: null, loading: false, error: null, initialized: false }

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: { accessToken: string; refreshToken: string; user: User } }>(
        '/auth/login', credentials,
      )
      const { accessToken, refreshToken, user } = res.data.data
      tokenStorage.setTokens(accessToken, refreshToken)
      return user
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed'
      return rejectWithValue(msg)
    }
  },
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post<{ message: string }>('/auth/register', data)
      return res.data.message
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed'
      return rejectWithValue(msg)
    }
  },
)

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: User }>('/users/me')
    return res.data.data
  } catch {
    return rejectWithValue(null)
  }
})

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refreshToken = tokenStorage.getRefresh()
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken }).catch(() => {})
  }
  tokenStorage.clear()
})

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) { state.error = null },
    setUser(state, action: PayloadAction<User>) { state.user = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null })
      .addCase(loginUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.initialized = true })
      .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
      .addCase(fetchMe.pending, (state) => { state.loading = true })
      .addCase(fetchMe.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.initialized = true })
      .addCase(fetchMe.rejected, (state) => { state.loading = false; state.user = null; state.initialized = true })
      .addCase(logoutUser.fulfilled, (state) => { state.user = null; state.initialized = true })
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null })
      .addCase(registerUser.fulfilled, (state) => { state.loading = false })
      .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
  },
})

export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer
