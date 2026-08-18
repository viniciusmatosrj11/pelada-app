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
      // A função RPC do Supabase valida automaticamente se há assinatura ativa OU se o trial de 7 dias é válido
      const { data, error } = await supabase.rpc('minha_licenca_esta_ativa')

      if (!error && data === true) {
        setAcessoLiberado(true)
      } else {
        setAcessoLiberado(false)
      }
    } catch (err) {
      console.error("Erro na checagem de acesso:", err)
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

  // 1. Não logado -> vai pro login
  if (!user) {
    return <Navigate to="/entrar" replace />
  }

  // 2. Logado, sem assinatura e com o trial expirado -> vai pro /ativar
  if (!acessoLiberado) {
    return <Navigate to="/ativar" replace />
  }

  // 3. Tudo ok -> mostra a página
  return children
}