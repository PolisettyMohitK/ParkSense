import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import type { Role } from '../types'

interface RoleRouteProps {
  roles: Role[]
  children: ReactNode
}

/** Renders children only for the given roles; everyone else lands on their own home page. */
export default function RoleRoute({ roles, children }: RoleRouteProps) {
  const user = useAppSelector((state) => state.auth.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
