import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { EXPIRES_KEY, TOKEN_KEY, USER_KEY, clearStoredSession } from '../api/client'
import type { User } from '../types'

export interface AuthState {
  token: string | null
  user: User | null
  /** Epoch millis when the token stops being accepted. */
  expiresAt: number | null
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function loadInitialAuthState(now: number = Date.now()): AuthState {
  const token = localStorage.getItem(TOKEN_KEY)
  const user = loadStoredUser()
  const expiresAt = Number(localStorage.getItem(EXPIRES_KEY)) || null
  // A token without its user, or one that has already expired, is not a usable session.
  if (!token || !user || (expiresAt !== null && expiresAt <= now)) {
    clearStoredSession()
    return { token: null, user: null, expiresAt: null }
  }
  return { token, user, expiresAt }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialAuthState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: User; expiresInMs?: number }>) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.expiresAt = action.payload.expiresInMs ? Date.now() + action.payload.expiresInMs : null
      localStorage.setItem(TOKEN_KEY, action.payload.token)
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
      if (state.expiresAt) {
        localStorage.setItem(EXPIRES_KEY, String(state.expiresAt))
      } else {
        localStorage.removeItem(EXPIRES_KEY)
      }
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload))
    },
    logout(state) {
      state.token = null
      state.user = null
      state.expiresAt = null
      clearStoredSession()
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer
