import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

// Mantemos o nome original 'RotaProtegida' para não quebrar o código
export default function RotaProtegida({ children }) {
  const { user, carregando: carregandoAuth } = useAuth()
  const [verificando, setVerificando] = useState(true)
  const [acessoLiberado, setAcessoLiberado] = useState(false)

  useEffect(() => {
    if (user) {
      checarAssinatura()
    } else if (!carregandoAuth) {
      setVerificando(false)
    }
  }, [user, carregandoAuth])

  async function checarAssinatura() {
    setVerificando(true)
    try {
      // Chamamos a mesma função RPC de antes para não quebrar o vínculo
      // Mas agora ela valida a assinatura mensal de R$ 20 no banco
      const { data, error } = await supabase.rpc('minha_licenca_esta_ativa')

      if (!error && data === true) {
        setAcessoLiberado(true)
      } else {
        setAcessoLiberado(false)
      }
    } catch (err) {
      console.error("Erro na checagem:", err)
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

  // 2. Logado, mas sem assinatura ativa -> vai pro /ativar
  // (Como mantivemos o nome da rota /ativar, o redirecionamento funciona normalmente)
  if (!acessoLiberado) {
    return <Navigate to="/ativar" replace />
  }

  // 3. Tudo ok -> mostra a página
  return children
}