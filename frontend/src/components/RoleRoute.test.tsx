import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer, { setCredentials } from '../store/authSlice'
import RoleRoute from './RoleRoute'
import ProtectedRoute from './ProtectedRoute'
import type { Role } from '../types'

function renderAt(path: string, role: Role | null) {
  const store = configureStore({ reducer: { auth: authReducer } })
  if (role) {
    store.dispatch(
      setCredentials({
        token: 'jwt',
        expiresInMs: 60_000,
        user: { id: 1, fullName: 'Test', email: 't@test.dev', role, enabled: true, createdAt: '' },
      }),
    )
  }
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['ADMIN', 'MANAGER']}>
                  <div>staff dashboard</div>
                </RoleRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('route guards', () => {
  it('lets staff through', () => {
    renderAt('/dashboard', 'MANAGER')
    expect(screen.getByText('staff dashboard')).toBeInTheDocument()
  })

  it('sends drivers to their own home instead of a page that would 403', () => {
    renderAt('/dashboard', 'USER')
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('sends anonymous visitors to login', () => {
    renderAt('/dashboard', null)
    expect(screen.getByText('login')).toBeInTheDocument()
  })
})
