import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppUser } from '../../types'

export interface AuthState {
  user: AppUser | null
  token: string | null
  source: 'api' | 'local' | null
}

const initialState: AuthState = { user: null, token: null, source: null }

export function getSavedAuth(): AuthState {
  try {
    const value = localStorage.getItem('salary-management-auth')
    if (!value) return initialState
    const saved = { ...initialState, ...JSON.parse(value) as AuthState }
    const expectedSource = import.meta.env.VITE_API_BASE_URL ? 'api' : 'local'
    return saved.source === expectedSource ? saved : initialState
  } catch {
    return initialState
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<AuthState>) {
      state.user = action.payload.user
      state.token = action.payload.token
    },
    signedOut(state) {
      state.user = null
      state.token = null
    },
  },
})

export const { signedIn, signedOut } = authSlice.actions
export default authSlice.reducer
