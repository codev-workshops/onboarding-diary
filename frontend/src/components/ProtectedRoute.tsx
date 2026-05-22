import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

interface Props {
  children: React.ReactNode
  roles?: Role[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
