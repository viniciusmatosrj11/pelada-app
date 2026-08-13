import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Mantemos o nome original 'AtivarLicenca' para não quebrar suas rotas/importações
export default function AtivarLicenca() {
  const [erro, setErro] = useState('')
  const [carregandoAssinatura, setCarregandoAssinatura] = useState(false)

  async function assinarComStripe() {
    setErro('')
    setCarregandoAssinatura(true)
    try {
      const { data: sessao } = await supabase.auth.getSession()
      const token = sessao?.session?.access_token

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-checkout-stripe`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const dados = await resp.json()
      if (!resp.ok || !dados.url) {
        throw new Error(dados.erro || 'Não foi possível iniciar o pagamento.')
      }

      window.location.href = dados.url
    } catch (err) {
      setErro(err.message)
      setCarregandoAssinatura(false)
    }
  }

  return (
    <div className="min-h-screen bg-giz flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm">
        <Link to="/painel" className="text-grama-600 text-sm font-semibold block mb-4">
          ← Voltar
        </Link>

        <div className="card text-center py-8 px-6 space-y-4 shadow-sm">
          <div className="text-4xl">⭐</div>
          <h1 className="text-xl font-bold text-grama-700">Ative seu Acesso</h1>
          <p className="text-carvao/70 text-sm">
            Tenha acesso completo à plataforma por apenas <strong className="text-grama-700">R$ 20,00 por mês</strong>.
          </p>

          {erro && <p className="text-barro text-sm font-medium">{erro}</p>}

          <button
            onClick={assinarComStripe}
            disabled={carregandoAssinatura}
            className="btn-primario w-full py-3 font-semibold"
          >
            {carregandoAssinatura ? 'Redirecionando...' : 'Assinar Agora (R$ 20/mês)'}
          </button>
        </div>
      </div>
    </div>
  )
}