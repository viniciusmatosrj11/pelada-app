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
      checarAcessoOuTrial()
    } else if (!carregandoAuth) {
      setVerificando(false)
    }
  }, [user, carregandoAuth])

  async function checarAcessoOuTrial() {
    setVerificando(true)
    try {
      // 1. Verifica se tem licença/assinatura ativa via banco
      const { data: licencaAtiva, error } = await supabase.rpc('minha_licenca_esta_ativa')

      if (!error && licencaAtiva === true) {
        setAcessoLiberado(true)
        setVerificando(false)
        return
      }

      // 2. Se não tem assinatura ativa, valida se está dentro dos 7 dias de Teste Gratuito (Trial)
      // Pegamos a data de criação do usuário logado (auth.users)
      const createdAt = user?.created_at

      if (createdAt) {
        const dataCadastro = new Date(createdAt)
        const dataAtual = new Date()
        const diferencaEmMilissegundos = dataAtual - dataCadastro
        const diferencaDias = diferencaEmMilissegundos / (1000 * 60 * 60 * 24)

        // Se estiver dentro de 7 dias, libera o acesso como Trial
        if (diferencaDias <= 7) {
          setAcessoLiberado(true)
          setVerificando(false)
          return
        }
      }

      // 3. Se passou dos 7 dias e não tem assinatura, bloqueia
      setAcessoLiberado(false)
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

  // 3. Tudo ok (Assinante ou dentro dos 7 dias) -> mostra a página
  return children
}