import { Navigate } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function RotaProtegida({ children }) {
  const { user, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-grama-600">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/entrar" replace />
  }

  return children
}
