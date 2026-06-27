import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
}

const stored = localStorage.getItem('lms_theme') as Theme | null

const initialState: ThemeState = {
  theme: stored ?? 'light',  // Default light theme
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
      localStorage.setItem('lms_theme', action.payload)
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('lms_theme', state.theme)
    },
  },
})

export const { setTheme, toggleTheme } = themeSlice.actions
export default themeSlice.reducer
