import { configureStore, combineReducers } from '@reduxjs/toolkit'
import themeReducer from '@/features/theme/themeSlice'
import authReducer from '@/features/auth/authSlice'

const rootReducer = combineReducers({
  theme: themeReducer,
  auth: authReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: [] } }),
  devTools: import.meta.env.DEV,
})

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
