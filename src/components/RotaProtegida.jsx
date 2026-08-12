import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

export default function RotaProtegida({ children }) {
  const { user, carregando: carregandoAuth } = useAuth()
  const [verificandoLicenca, setVerificandoLicenca] = useState(true)
  const [temLicenca, setTemLicenca] = useState(false)

  useEffect(() => {
    if (user) {
      checarLicenca()
    } else if (!carregandoAuth) {
      setVerificandoLicenca(false)
    }
  }, [user, carregandoAuth])

  async function checarLicenca() {
    setVerificandoLicenca(true)
    const { data } = await supabase
      .from('licencas')
      .select('*')
      .eq('comprador_email', user.email)
      .eq('utilizada', true)
      .maybeSingle()

    if (data) {
      setTemLicenca(true)
    }
    setVerificandoLicenca(false)
  }

  if (carregandoAuth || verificandoLicenca) {
    return (
      <div className="min-h-screen flex items-center justify-center text-grama-600">
        Carregando...
      </div>
    )
  }

  // 1. Se não estiver logado, manda para o login
  if (!user) {
    return <Navigate to="/entrar" replace />
  }

  // 2. Se estiver logado, mas NÃO ativou a licença, manda direto para a tela de ativação
  if (!temLicenca) {
    return <Navigate to="/ativar" replace />
  }

  // 3. Se estiver logado e com a licença ativa, libera o acesso à página
  return children
}