import { describe, expect, it } from 'vitest'
import reducer, { loadInitialAuthState, logout, setCredentials } from './authSlice'
import { EXPIRES_KEY, TOKEN_KEY, USER_KEY } from '../api/client'
import type { User } from '../types'

const user: User = {
  id: 7,
  fullName: 'Ravi Driver',
  email: 'user@parking.dev',
  role: 'USER',
  enabled: true,
  createdAt: '2026-10-01T00:00:00Z',
}

describe('authSlice', () => {
  it('persists credentials with their expiry', () => {
    const state = reducer(undefined, setCredentials({ token: 'jwt', user, expiresInMs: 60_000 }))
    expect(state.token).toBe('jwt')
    expect(state.expiresAt).toBeGreaterThan(Date.now())
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt')
    expect(JSON.parse(localStorage.getItem(USER_KEY)!).email).toBe(user.email)
  })

  it('clears storage on logout', () => {
    const signedIn = reducer(undefined, setCredentials({ token: 'jwt', user, expiresInMs: 60_000 }))
    const state = reducer(signedIn, logout())
    expect(state.token).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(EXPIRES_KEY)).toBeNull()
  })

  it('drops an expired stored session on startup', () => {
    localStorage.setItem(TOKEN_KEY, 'old')
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(EXPIRES_KEY, String(Date.now() - 1000))
    expect(loadInitialAuthState().token).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('drops a token stored without its user', () => {
    localStorage.setItem(TOKEN_KEY, 'orphan')
    expect(loadInitialAuthState().token).toBeNull()
  })

  it('restores a valid session', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt')
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + 60_000))
    expect(loadInitialAuthState()).toMatchObject({ token: 'jwt', user: { id: 7 } })
  })
})
