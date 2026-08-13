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
    // Antes: select direto na tabela `licencas` (sem checar expiração, sem RLS).
    // Agora: RPC que já valida o e-mail do JWT e a data_expiracao no servidor.
    const { data, error } = await supabase.rpc('minha_licenca_esta_ativa')

    if (!error && data === true) {
      setTemLicenca(true)
    } else {
      setTemLicenca(false)
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

  // 2. Se estiver logado, mas sem licença ativa (nunca ativou ou já expirou), manda para /ativar
  if (!temLicenca) {
    return <Navigate to="/ativar" replace />
  }

  // 3. Se estiver logado e com a licença ativa, libera o acesso à página
  return children
}
