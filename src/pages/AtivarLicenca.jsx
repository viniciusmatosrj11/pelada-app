import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

export default function AtivarLicenca() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [serial, setSerial] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [carregandoAssinatura, setCarregandoAssinatura] = useState(false)

  async function ativar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const codigo = serial.trim().toUpperCase()

    try {
      const { error } = await supabase.rpc('ativar_licenca_por_serial', {
        p_serial: codigo,
      })

      if (error) {
        throw new Error(error.message || 'Erro ao ativar a licença. Tente novamente.')
      }

      setSucesso(true)
      setTimeout(() => {
        navigate('/painel')
      }, 2000)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

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

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-xl font-bold text-grama-700">Ativar sua Conta</h1>
          <p className="text-carvao/70 text-sm mt-1">
            Assine automaticamente pelo Stripe ou, se você recebeu uma chave serial, ative abaixo.
          </p>
        </div>

        {sucesso ? (
          <div className="card text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-grama-700">Conta ativada com sucesso!</p>
            <p className="text-sm text-carvao/60 mt-1">Redirecionando para o painel...</p>
          </div>
        ) : (
          <>
            <button
              onClick={assinarComStripe}
              disabled={carregandoAssinatura}
              className="btn-primario w-full mb-4"
            >
              {carregandoAssinatura ? 'Redirecionando...' : 'Assinar com Stripe'}
            </button>

            <div className="text-center text-xs text-carvao/40 mb-4">ou</div>

            <form onSubmit={ativar} className="card space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Chave Serial</label>
                <input
                  className="input uppercase font-mono tracking-wider"
                  required
                  placeholder="FM-XXXXX-XXXXX"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                />
              </div>

              {erro && <p className="text-barro text-sm font-medium">{erro}</p>}

              <button className="btn-primario w-full" disabled={carregando}>
                {carregando ? 'Verificando...' : 'Ativar com Chave Serial'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}