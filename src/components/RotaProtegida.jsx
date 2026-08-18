import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

export default function RotaProtegida({ children }) {
  const { user, carregando: carregandoAuth } = useAuth()
  const [verificando, setVerificando] = useState(true)
  const [acessoLiberado, setAcessoLiberado] = useState(false)

  useEffect(() => {
    if (user) {
      checarAcesso()
    } else if (!carregandoAuth) {
      setVerificando(false)
    }
  }, [user, carregandoAuth])

  async function checarAcesso() {
    setVerificando(true)
    try {
      // Chama a função RPC criada no Supabase
      const { data, error } = await supabase.rpc('minha_licenca_esta_ativa')

      if (error) {
        console.error("Erro na RPC do Supabase:", error.message)
        // Fallback de segurança: se der erro na RPC, calcula o trial direto no frontend para não travar o usuário
        if (user?.created_at) {
          const dias = (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)
          if (dias <= 7) {
            setAcessoLiberado(true)
            setVerificando(false)
            return
          }
        }
        setAcessoLiberado(false)
      } else {
        setAcessoLiberado(data === true)
      }
    } catch (err) {
      console.error("Erro inesperado na checagem:", err)
      setAcessoLiberado(false)
    } finally {
      setVerificando(false)
    }
  }

  if (carregandoAuth || verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-grama-600 font-medium">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/entrar" replace />
  }

  if (!acessoLiberado) {
    return <Navigate to="/ativar" replace />
  }

  return children
}