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

  async function ativar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const codigo = serial.trim().toUpperCase()

    try {
      // 1. Verifica se o serial existe no banco
      const { data: licenca, error: erroBusca } = await supabase
        .from('licencas')
        .select('*')
        .eq('serial_key', codigo)
        .single()

      if (erroBusca || !licenca) {
        throw new Error('Chave serial inválida. Verifique o código enviado.')
      }

      // 2. Verifica se já foi utilizada
      if (licenca.utilizada) {
        throw new Error('Esta chave serial já foi utilizada por outro usuário.')
      }

      // 3. Marca o serial como utilizado e vincula ao email do usuário logado
      const { error: erroAtualizacao } = await supabase
        .from('licencas')
        .update({
          utilizada: true,
          comprador_email: user?.email,
        })
        .eq('id', licenca.id)

      if (erroAtualizacao) {
        throw new Error('Erro ao ativar a licença. Tente novamente.')
      }

      setSucesso(true)
      setTimeout(() => {
        navigate('/painel') // Redireciona para o painel após ativar
      }, 2000)

    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
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
            Digite abaixo a chave serial que você recebeu para liberar o seu acesso completo.
          </p>
        </div>

        {sucesso ? (
          <div className="card text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-grama-700">Conta ativada com sucesso!</p>
            <p className="text-sm text-carvao/60 mt-1">Redirecionando para o painel...</p>
          </div>
        ) : (
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
              {carregando ? 'Verificando...' : 'Ativar Licença'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}